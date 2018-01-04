module.exports = function (options) {
  const seneca = this;
  const plugin = 'seneca-newrelic';
  const newrelic = options.newrelic; // Pass around the already initialized instance of NR
  const roles = options.roles;
  const filter = options.filter;
  // Throw if no role is defined to listen to
  if(!roles || !roles instanceof Array || roles.length <= 0) {
    throw new Error(`Empty parameter "roles" for seneca-newrelic, passed ${roles}`);
  }
  // Set default pattern for seneca
  
  function defineTransaction(args, done) {
    const transactionName = args.meta$.pattern;
    const parameters = filter(this.util.clean(args));
    newrelic.setTransactionName(transactionName);
    seneca.log.debug(`transactionName ${transactionName}`);
    
    newrelic.addCustomParameters(parameters);
    seneca.log.debug(parameters);
    this.prior(args, done);
  }

  function tagRoles(role) {
    seneca.log.debug('tagRoles loaded ', role);
    seneca.wrap({ role }, defineTransaction);
  };

  seneca.log.debug(`Plugin seneca-newrelic started with roles ${roles}`);
  roles.forEach(tagRoles);

  return {
    name: plugin,
  };
}
