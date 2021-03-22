# koishi-plugin-forward  

基于[koishi](https://github.com/koishijs/koishi)的消息转发插件，支持多个平台，可以非常方便地实现不同平台消息的互通  

## 使用方法  

请先将您的[koishi](https://koishi.js.org)成功配置，需要安装依赖`koishi-plugin-mysql`  
然后通过`yarn add koishi-plugin-forward`(或`npm install koishi-plugin-forward`)安装本插件并按照一般的插件将此插件添加到您的koishi中  

## 指令&特性  

- `forward <id>` - 添加一个转发（注意，这是单向转发，需要在对方再添加一次转发才能实现互通）  
- `forward -r <id>` - 删除一个转发  
- `forward.info` - 查看本群id  
- `forward.list` - 列出转发列表  
- `forward.update` - 更新转发  

- 发送消息时如果使用`//`开头将不会转发此条消息到其他平台  

## LICENSE

MIT
