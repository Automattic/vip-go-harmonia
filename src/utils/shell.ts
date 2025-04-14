import { platform } from 'node:os';
import execa, { type ExecaChildProcess } from 'execa';

const subprocesses: ExecaChildProcess[] = [];
let cwd = process.cwd();

export function escapeShellArg( arg: string ): string {
	if ( ! arg ) {
		return '""';
	}

	if ( platform() === 'win32' ) {
		// For Windows cmd.exe, we need to handle several special characters
		// First handle backslashes and double quotes
		let escaped = arg.replace( /(\\*)"/g, '$1$1\\"' ).replace( /(\\*)$/, '$1$1' );

		// Then handle special shell characters: ^ ! % ~ & < > | ' `
		escaped = escaped.replace( /([&^|<>()!"%~])/g, '^$1' );

		return `"${ escaped }"`;
	}

	// Unix/Linux/macOS: single quotes around the string and escape single quotes within
	return `'${ arg.replace( /'/g, "'\\''" ) }'`;
}

export function executeShell( command: string, envVars = {} ) {
	const envVariables = {
		VIP_GO_APP_ID: 'unknown',
	};

	const promise = execa.command( command, {
		all: true,
		cwd,
		env: { ...envVariables, ...envVars },
	} );

	subprocesses.push( promise );

	// Remove the promise from the list when finalized
	promise.then( () => {
		const index = subprocesses.indexOf( promise, 0 );
		if ( index > -1 ) {
			subprocesses.splice( index, 1 );
		}
	} ).catch( () => {
		const index = subprocesses.indexOf( promise, 0 );
		if ( index > -1 ) {
			subprocesses.splice( index, 1 );
		}
	} );

	return promise;
}

export function executeShellSync( command: string, envVars = {} ) {
	const envVariables = {
		VIP_GO_APP_ID: 'unknown',
	};

	return execa.commandSync( command, {
		all: true,
		cwd,
		env: { ...envVariables, ...envVars },
	} );
}

export function cleanUp() {
	subprocesses.forEach( subprocess => {
		if ( null !== subprocess.exitCode ) {
			return;
		}
		subprocess.kill();
	} );
}

export function setCwd( path: string ) {
	cwd = path;
}
