import TestSuite from '../../lib/tests/testsuite';
import DockerBuild from './build.test';
import DockerRun from './run.test';
import { executeShell } from '../../utils/shell';
import chalk from 'chalk';
import HealthcheckTest from './healthcheck.test';

export default class DockerSuite extends TestSuite {
	constructor() {
		super( 'Docker', 'Builds and runs the application in a Docker container' );
	}

	setupTests() {
		this.addTest( new DockerBuild() )
			.addTest( new DockerRun() )
			.addTest( new HealthcheckTest() );
	}

	async prepare() {
		// Check if Docker is installed
		try {
			const dockerShell = await executeShell( 'docker -v' );

			if ( dockerShell.exitCode !== 0 || ! dockerShell.stdout ) {
				throw new Error;
			}

			const dockerVersion = dockerShell.stdout.match( /Docker version ([0-9]+\.[0-9]+(?:\.[0-9]+)?)/ )?.[ 1 ];
			this.notice( `Found Docker Engine ${ chalk.yellow( dockerVersion ) }` );
		} catch ( error ) {
			this.blocker( 'Looks like your environment is missing Docker. Without Docker installed on your system ' +
				"it's not possible to properly test all the application functionality." );
		}
	}
}
