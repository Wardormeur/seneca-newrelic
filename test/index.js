const _lab = require('lab');
const sinon = require('sinon');
const lab = exports.lab = _lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = require('code').expect;
const S = require('seneca');


describe('seneca-newrelic', function () {


  lab.afterEach(function (done) {
    done();
  });

  it('should throw when role is empty', function (done) {
    const debugStub = sinon.stub();
    const wrapStub = sinon.stub();
    const logStub = { debug: debugStub };
    try {
      require('..').apply({ log: logStub, wrap: wrapStub }, [{
        newrelic: sinon.stub(),
        roles: [],
        filter: (a) => a,
      }]);
    } catch(err) {
      expect(err.message).to.equal('Empty parameter "roles" for seneca-newrelic, passed ');
      done();
    }
  });
  it('should throw when role is not defined', function (done) {
    const debugStub = sinon.stub();
    const wrapStub = sinon.stub();
    const logStub = { debug: debugStub };
    try {
      require('..').apply({ log: logStub, wrap: wrapStub }, [{
        newrelic: sinon.stub(),
        filter: (a) => a,
      }]);
    } catch(err) {
      expect(err.message).to.equal('Empty parameter "roles" for seneca-newrelic, passed undefined');
      done();
    }
  });

  it('should register a wrap for each role defined', function (done) {
    const debugStub = sinon.stub();
    const wrapStub = sinon.stub();
    const logStub = { debug: debugStub };
    require('..').apply({ log: logStub, wrap: wrapStub }, [{
      newrelic: sinon.stub(),
      roles: ['test1', 'test2', 'test3'],
      filter: (a) => a,
    }]);
    expect(wrapStub.callCount).to.equal(3);
    expect(wrapStub.firstCall.args[0]).to.deep.equal({ role: 'test1' });
    expect(wrapStub.secondCall.args[0]).to.deep.equal({ role: 'test2' });
    expect(wrapStub.thirdCall.args[0]).to.deep.equal({ role: 'test3' });
    done();
  });
  
  describe('with seneca', function () {
    const sandbox = sinon.sandbox.create();
    const cbSpy = sandbox.stub();
    const setTName = sandbox.stub();
    const addCP = sandbox.stub();
    const filterStub = sandbox.stub();
    let seneca;

    lab.beforeEach(function (done) {
       seneca = S();
       cbSpy.callsFake((args, done) => done(null, { res: args.query }));
       seneca.use(require('..'), {
        newrelic: {
          setTransactionName: setTName,
          addCustomParameters: addCP,
        },
        roles: ['test1'],
        filter: filterStub,
      });
      [1, 2].forEach((i) => {
        seneca.add({ role: `test${i}`, cmd: 'bla' }, cbSpy);
      });
      done();
    });

    lab.afterEach(function (done) {
      seneca.close();
      sandbox.reset();
      done();
    });

    it('should call newrelic before an act', function (done) {
      filterStub.returnsArg(0);
      seneca.ready(() => {
        seneca.act({ role: 'test1', cmd: 'bla', query: 'duh' }, function (err, res) {
          expect(cbSpy.callCount).to.equal(1);
          expect(res).to.deep.equal({ res: 'duh' });
          expect(addCP.callCount).to.equal(1);
          expect(setTName.callCount).to.equal(1);
          expect(setTName.firstCall.args[0]).to.equal('cmd:bla,role:test1');
          done();
        });
      });
    });

    it('should not call newrelic on unexpected acts', function (done) {
      filterStub.returnsArg(0);
      seneca.ready(() => {
        seneca.act({ role: 'test2', cmd: 'bla', query: 'duh' }, function (err, res) {
          expect(cbSpy.callCount).to.equal(1);
          expect(res).to.deep.equal({ res: 'duh' }); 
          expect(setTName.callCount).to.equal(0);
          expect(addCP.callCount).to.equal(0);
          done();
        });
      }); 
    });

    it('should filter data', function (done) {
      filterStub.callsFake((pattern) => { delete pattern.user.email; return pattern;});
      seneca.ready(() => {
        seneca.act({ role: 'test1', cmd: 'bla', query: 'duh', user: { email: 'a@a', id: 1 } }, function (err, res) {
          expect(cbSpy.callCount).to.equal(1);
          expect(res).to.deep.equal({ res: 'duh' });
          expect(filterStub.callCount).to.equal(1);
          expect(setTName.callCount).to.equal(1);
          expect(addCP.callCount).to.equal(1);
          expect(setTName.firstCall.args[0]).to.equal('cmd:bla,role:test1');
          // Basically we check if the email is not included according to the filter
          expect(addCP.firstCall.args[0]).to.deep.equal({ role: 'test1', cmd: 'bla', query: 'duh', user: { id: 1 } });
          done();
        });
      });
    });
  });

});
