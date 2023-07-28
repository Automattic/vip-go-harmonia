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
## Contributing

For details about contributing to this project (e.g. publishing a release), please see [CONTRIBUTING.md](CONTRIBUTING.md).
