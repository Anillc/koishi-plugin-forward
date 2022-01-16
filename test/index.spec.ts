import {App} from 'koishi';
import {expect} from 'chai';
import {assert, spy} from "sinon";
import mock from '@koishijs/plugin-mock';
import memory from '@koishijs/plugin-database-memory';
import {apply as forward} from 'src/index';

const app = new App().plugin(mock).plugin(memory);

const c1 = app.mock.client("123", "456");

app.plugin(forward);

before(async () => {
    await app.start();
});
describe('Forward CLI', () => {
    describe('CLI', () => {
        it('Should Normally Add Forward', async () => {
            await c1.shouldReply("forward mock:654", "添加成功！，请使用forward.update更新\n");
            const forward = (await app.database.getChannel("mock", "456")).forward;
            expect(forward).to.equal(["mock:654"]);
        });
        it('Should Normally Remove Forward', async () => {
            await app.database.setChannel('mock', '123', {forward: ["mock:654"]});
            await c1.shouldReply('forward -r mock:654', '删除成功！请使用forward.update更新');
            const forward = (await app.database.getChannel('mock', '456')).forward;
            expect(forward).to.equal([]);
        });
        it('Should Normally Show the Forwarding Info', async () => {
            await c1.shouldReply('forward.info', 'mock:456');
        });
        it('Should Normally Show the Forwardings', async () => {
            await c1.shouldReply('forward.list', '[]');
            await c1.receive('forward mock:654');
            await c1.receive('forward.update');
            await c1.shouldReply('forward.list', '["mock:654"]');
        });
        it('Should Normally Update the Forwardings from Database', async () => {
            const get = app.database.get = spy();
            await c1.receive('forward.update');
            assert.calledOnce(get);
            get.restore();
        });
        afterEach(async () => {
            await app.database.drop();
            await app.mock.initChannel("456");
            await app.mock.initUser("123", 4);
        });
    });
    describe('Forwarding', () => {
        it('Basic Forwarding', async () => {
            const send = app.bots[0].sendMessage = spy();
            await c1.shouldReply("forward mock:654", "添加成功！，请使用forward.update更新\n");
            await c1.shouldReply('forward.update', '更新成功！');
            await c1.shouldNotReply('Hello?');
            expect(send.args).to.have.length(1);
            expect(send.args).to.have.shape([['654', '123: hello']]);
            send.restore();
        });
        afterEach(async () => {
            await app.database.drop();
            await app.mock.initChannel("456");
            await app.mock.initUser("123", 4);
        });
    });
});