import {MockedApp} from "@koishijs/test-utils/lib/app";
import {apply as forward} from 'src/index';

const app = new MockedApp()

const s1 = app.client("guild1", '101');
const s2 = app.client("guild2", '102');

app.plugin(forward);

test('forward', async () => {
    await s1.receive(`forward ${s2.channelId}`);

})