import TestSuite from '../../lib/tests/testsuite';
import DisallowedFiles from './disallowed-files';

export default class GitSuite extends TestSuite {
	constructor() {
		super( 'Git', 'Validates the project’s source control' );
	}

	setupTests() {
		this.addTest( new DisallowedFiles() );
	}
}
