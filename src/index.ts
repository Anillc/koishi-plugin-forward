import { Context, Session, Logger, segment } from 'koishi'

declare module 'koishi' {
    interface Channel {
        forward: Array<string>
    }
}

const logger = new Logger('forward')

const forwarding: Record<string, Array<string>> = {}
// cid, messageId
const messageRecord: Array<[[string, string], [string, string]]> = []

export const name = 'forward'

export const using = ['database']

export async function apply(ctx:Context) {
    ctx.model.extend('channel', { forward: 'list' })
    const channels = await ctx.database.get('channel', {}, ['platform', 'id', 'forward'])
    channels.forEach(channel => forwarding[`${channel.platform}:${channel.id}`] = channel.forward)
    ctx.middleware(mid(ctx))
    ctx.command('forward [to]','消息转发', { authority: 2 })
        .option('remove', '-r 删除转发')
        .option('list', '-l 查看转发列表')
        .option('info', '-i 查看本群 id')
        .channelFields(['forward'])
        .action(({ session, options }, to) => {
            if (!session.channelId) return '请在群聊中使用该指令'
            const forward = session.channel.forward

            console.log(123);
            
            if (options.list) return JSON.stringify(forward)
            if (options.info) return session.cid
            if (!to) return '缺少必要参数'

            const index = forward.indexOf(to)
            if (options.remove) {
                if (index == -1) return '没有转发到该频道的记录'
                forward.splice(index, 1)
                forwarding[session.cid] = forward
                return '删除成功!'
            }
            if (index >= 0) return '已经存在记录'
            forward.push(to);
            forwarding[session.cid] = forward
            return '添加成功!'
        });
}

function mid(ctx: Context) {
    return function (session: Session, next: () => void) {
        const forward = forwarding[session.cid]
        if (!session.channel || session.content.startsWith('//') || !forward) return next()
        forward.forEach(async to => {
            const [toPlatform, toChannelId] = to.split(':')
            const elements = segment.parse(session.content)

            // transform images
            for (const element of elements) {
                if (element.type === 'face' && element.attrs.url) element.type = 'image'
                if (element.type !== 'image' || !element.attrs.url?.startsWith('http')) continue
                try {
                    const data = await ctx.http.get(element.attrs.url, { responseType: 'arraybuffer' })
                    const img = Buffer.from(data).toString('base64')
                    element.attrs.url = `base64://${img}`
                } catch (e) {
                    logger.info('error while transforming images', e)
                }
            }

            elements.unshift(segment('text', {
                content: `${session.username}: `
            }))

            if(session.quote) {
                let target: [string, string]
                for (const [a, b] of messageRecord) {
                    if (tupleEqual([session.cid, session.quote.messageId], a)) {
                        target = b
                        break
                    }
                    if (tupleEqual([session.cid, session.quote.messageId], b)) {
                        target = a
                        break
                    }
                }
                if (target) {
                    elements.unshift(segment.quote(target[1], { channelId: toChannelId }))
                }
            }

            ctx.broadcast([to], elements.join('')).then((ids) => {
                if (ids.length === 0) return
                messageRecord.push([[session.cid, session.messageId], [to, ids[ids.length - 1]]])
                if (messageRecord.length > 10000) messageRecord.shift()
            })
        })
        logger.debug(`forwarding: ${JSON.stringify(forward)} ${session.content}`)
        return next()
    }
}

function tupleEqual([a, b]: [string, string], [c, d]: [string, string]) {
    return a === c && b === d
}