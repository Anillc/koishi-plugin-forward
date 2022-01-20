import { Context, Session, Logger, segment } from 'koishi'

declare module 'koishi' {
    interface Channel {
        forward: Array<string>
    }
}

const logger = new Logger('forward')

const forwarding: Record<string, Array<string>> = {}

export const name='forward';

export async function apply(ctx:Context){
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
            if (index >= 0) return '已经存在记录';
            forward.push(to);
            forwarding[id] = forward
            return '添加成功!'
        });
}

function ignore(text: string){
    if (!text) return true
    const seg = segment.parse(text)
    if (seg[0].type === 'quote') {
        seg.shift()
    }
    return segment.join(seg).trim().startsWith('//')
}

function mid(ctx: Context) {
    return function (session: Session, next: () => void) {
        const content: string = session.content
        if (!session.channelId || ignore(content)) return next()
        const forward = forwarding[`${session.platform}:${session.channelId}`]
        ctx.broadcast(forward, `${session.username}: ${content}`)
        logger.debug(`forwarding: ${JSON.stringify(forward)} ${content}`)
        return next()
    }
}
