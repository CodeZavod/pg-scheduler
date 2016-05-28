
import Scheduler from '../src/index';

function defer() {
  var resolve, reject;
  var promise = new Promise(function() {
    resolve = arguments[0];
    reject = arguments[1];
  });
  return {
    resolve: resolve,
    reject: reject,
    promise: promise
  };
}

describe('Scheduler', () => {
  it('should export function', () => {
    Scheduler.should.be.a.Function();
  });

  it('should have a `.process` static method', () => {
    Scheduler.should.have.property('process').which.is.a.Function();
  });

  it('should have a `.processorsStorage` static property', () => {
    Scheduler.should.have.property('processorsStorage').which.is.a.Object();
  });
});

describe('Instance', () => {
  let instance,
      startPromise;

  before(() => {
    instance = new Scheduler();
  });
  after(() => {
    return startPromise.then(() => {
      instance.stop();
    });
  });

  it('should have a `.start` method', () => {
    instance.should.have.property('start').which.is.a.Function();
  });

  it('should have a `.stop` method', () => {
    instance.should.have.property('stop').which.is.a.Function();
  });

  it('should have a `.Task` property', () => {
    instance.should.have.property('Task').which.is.a.Object();
  });

  it('should `.start()` method return a promise', () => {
    (startPromise = instance.start()).should.be.a.Promise();
  });
});

describe('Processing', () => {
  let instance;
  before(() => {
    instance = new Scheduler({pollingInterval: 500});
  });
  after(() => {
    return instance.Task.destroy({where: {$or: [{name: 'task'}]}}).then(() => {
      instance.stop();
    });
  });

  it('should start', () => {
    return instance.start();
  });

  it('should create new Task', () => {
    return instance.once(new Date(), 'task', {
      qwe: 'asd'
    });
  });

  it('should add new processor', (done) => {
    instance.on('task-task-complete', () => {
      done();
    });
    Scheduler.process('task', (task, cb) => {
      console.log('processing', task.get({plain: true}));
      task.should.have.properties(['data', 'name']);
      cb();
    });
  });

  it('should create new task and add 3 processors', (done) => {
    let defers = [defer(), defer(), defer()],
        promises = [defers[0].promise, defers[1].promise, defers[2].promise];

    for(let i = 0; i < 3; i++) {
      Scheduler.process('task2', (task, cb) => {
        // console.log(`processing-${i}`, task.get({plain: true}));
        task.should.have.properties(['data', 'name']);
        cb();
        defers[i].resolve();
      });
    }

    Promise.all(promises).then(() => {
      return instance.Task.destroy({where: {name: 'task2'}}).then(() => {
        done();
      });
    });

    instance.every(100, 'task2', {
      qwe: 'asd'
    });
  });
  
  it('should respect concurrency', (done) => {
    let timesProcessed = 0;

    for(let i = 0; i < 3; i++) {
      Scheduler.process('task3', (task, cb) => {
        timesProcessed++;
        // console.log('start processing task3 with processor', i);
        task.should.have.properties(['data', 'name']);
        setTimeout(() => {
          // console.log('stop processing task3 with processor', i);
          cb();
        }, 1000);
      });
    }

    setTimeout(() => {
      if(timesProcessed > 2) {
        return done(new Error('concurrency has no respect'));
      }

      return instance.Task.destroy({where: {name: 'task3'}}).then(() => {
        done();
      });
    }, 2500);

    instance.every(100, 'task3', {
      qwe: 'asd'
    }, {concurrency: 1});
  });
});
