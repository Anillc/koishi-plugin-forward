import { Context, Session, Logger, segment } from 'koishi'

declare module 'koishi' {
    interface Channel {
        forward: Array<string>
    }
}

const logger = new Logger('forward')

const forwarding: Record<string, Array<string>> = {}
const messageRecord: Array<[string, string, string, string]> = []

export const name = 'forward'

export async function apply(ctx:Context) {
    ctx.model.extend('channel', { forward: 'list' })
    await new Promise(cb => ctx.using(['database'], cb))
    const channels = await ctx.database.get('channel', {}, ['platform', 'id', 'forward'])
    channels.forEach(channel => forwarding[`${channel.platform}:${channel.id}`] = channel.forward)
    ctx.middleware(mid(ctx))
    ctx.command('forward <to>','消息转发', { authority: 2 })
        .option('remove', '-r 删除转发')
        .option('list', '-l 查看转发列表')
        .option('info', '-i 查看本群 id')
        .channelFields(['forward'])
        .action(({ session, options }, to) => {
            if (!session.channelId) return '请在群聊中使用该指令'
            const forward = session.channel.forward
            const id = `${session.platform}:${session.channelId}`

            if (options.list) return JSON.stringify(forward)
            if (options.info) return id
            if (!to) return '缺少必要参数'

            const index = forward.indexOf(to)
            if (options.remove) {
                if (index == -1) return '没有转发到该频道的记录'
                forward.splice(index, 1)
                forwarding[id] = forward
                return '删除成功!'
            }
            if (index >= 0) return '已经存在记录'
            forward.push(to);
            forwarding[id] = forward
            return '添加成功!'
        });
}

function ignore(chain: segment.Chain){
    if (chain[0].type === 'quote') {
        chain = chain.slice(1)
    }
    return segment.join(chain).trim().startsWith('//')
}

function mid(ctx: Context) {
    return function (session: Session, next: () => void) {
        const chain = segment.parse(session.content)
        if (!session.channelId || ignore(chain)) return next()
        const forward = forwarding[`${session.platform}:${session.channelId}`]
        forward.forEach(to => {
            const [toPlatform] = to.split(':')
            const content = segment.transform(chain, {
                quote({ id }) {
                    let rec = messageRecord.find(([platform1, platform2, id1]) =>
                        platform1 === session.platform && platform2 === toPlatform && id1 === id)
                    return segment('quote', {
                        id: rec?.[3] || id
                    })
                }
            })
            ctx.broadcast([to], `${session.username}: ${content}`).then(([id]) => {
                messageRecord.push([session.platform, toPlatform, session.messageId, id])
                messageRecord.push([toPlatform, session.platform, id, session.messageId])
                if (messageRecord.length > 1000) {
                    messageRecord.shift()
                }
            })
        })
        logger.debug(`forwarding: ${JSON.stringify(forward)} ${session.content}`)
        return next()
    }
}
