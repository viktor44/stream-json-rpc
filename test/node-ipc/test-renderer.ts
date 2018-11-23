import * as ipc from 'node-ipc';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';
import { RPCChannel } from '../../src/types';

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'client';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.connectTo('server', () => {
    ipc.of.server.on(
      'connect',
      () => {
        ipc.of.server.emit('socket.connected', { id: ipc.config.id });
      }
    );
  });
  return ipc.of.server;
};

class TestDuplex extends Duplex {
  ipcClient: any;
  socket: any;

  constructor(ipcClient: ReturnType<typeof getIPC>) {
    super();
    this.ipcClient = ipcClient;

    ipcClient.on('data', (data: any) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.ipcClient.emit('data', chunk.toString());
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const ipcClient = getIPC();

  const channel = rpcchannel();
  channel.setLink('server', new TestDuplex(ipcClient));

  process.on('exit', () => ipcClient.stop());

  return channel;
};

describe('forwards actions to and from renderer', () => {
  let channel: RPCChannel;

  before(async () => {
    channel = init();
  });

  it('should increment given number in remote process', (done) => {
    channel
      .request('server', 'inc', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return done();
        return done(new Error(`Unexpected result: ${result}`));
      });
  });
});
