{ Channel, Database, s } = require 'koishi'

Channel.extend ->
  forward: []
Database.extend 'koishi-plugin-mysql', ({ Domain, tables }) ->
  tables.channel.forward = new Domain.Array()

channels = null

updateChannels = (ctx) ->
  channels = await ctx.database.getAssignedChannels ['id','forward']

ignore = (text) ->
  seg = s.parse text
  return true if seg[0].data.content?.startsWith '//'
  return seg[0].type == 'quote' and seg[2].data.content?.trim().startsWith '//'

mid = (ctx) -> (session, next) ->
  content = session.content
  return next() if !session.channelId or ignore content
  try
    { forward } = channels.find (n) -> n.id == "#{session.platform}:#{session.channelId}"
  catch e
    updateChannels ctx
    return next()
  ctx.broadcast forward, "#{session.author.username}: #{content}"
  next()

isChannel = ({session}) ->
  return '请在群聊中使用此命令' if !session.channel
 
module.exports = (ctx) -> ctx.on 'connect', ->
  await updateChannels ctx
  ctx.middleware mid ctx
  cmd = ctx.command 'forward <to>'
  cmd.check isChannel
    .option 'remove', '-r 删除转发'
    .channelFields ['forward']
    .action ({session, options}, to) ->
      { forward } = session.channel
      return '缺少必要参数' if !to
      i = forward.indexOf to
      if options.remove
        return '没有转发到该频道的记录' if i == -1
        forward.splice i, 1
        return '删除成功！请使用forward.update更新'
      return '已经存在记录。' if i >= 0
      forward.push to
      return '添加成功！，请使用forward.update更新'
  cmd.subcommand '.list'
    .check isChannel
    .channelFields ['forward']
    .action ({session}) ->
      { forward } = session.channel
      return JSON.stringify forward
  cmd.subcommand '.info'
    .check isChannel
    .action ({session}) ->
      return session.channel.id
  cmd.subcommand '.update'
    .action ->
      await updateChannels ctx
      return '更新成功'
