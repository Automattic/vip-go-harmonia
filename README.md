# Harmonia

*Formely known as Preflight Checks.* The goal of this project is to provide a set of automated tests (or checks) that can test and validate the application functionality and responsiveness with an environment as close to production as possible, before the actual deployment to an environment.

## Building

```bash
$ npm run build 
```

## Running the CLI

After building Harmonia, it should be possible to run the CLI directly using the following command:

```bash
$ node dist/cli.js
```

The command can be linked and installed on the environment using `npm link`:

```bash
$ npm link
$ harmonia --help
```

## Links & References
 * [Project Thread](https://vipdecoupledp2.wordpress.com/2022/01/13/project-thread-preflight-checks-next-gen/)
 * [Initial project discovery](https://vipdecoupledp2.wordpress.com/2022/01/10/preflight-tests-next-gen-q1-2022-project/)
 * [Tests and User Experience](https://vipdecoupledp2.wordpress.com/2022/01/20/preflight-checks-tests-and-user-experience/)
 * [Proposed Architecture](https://vipdecoupledp2.wordpress.com/2022/01/26/preflight-checks-proposed-architecture/)
