import TestSuite from '../../lib/tests/testsuite';
import NpmScriptsTest from './npm-scripts.test';
import NpmEnginesTest from './npm-engines.test';

export default class NPMSuite extends TestSuite {
	constructor() {
		super( 'NPM `package.json`' );
	}

	setupTests() {
		this.addTest( new NpmScriptsTest() )
			.addTest( new NpmEnginesTest() );
	}
}
