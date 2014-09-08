import ClosableInterface = require('../../utils/interfaces/ClosableInterface');

/**
 * @interface
 * @class core.ui.UiSplashScreenInterface
 */
interface UiSplashScreenInterface extends ClosableInterface {

	setStatus (status:string):void;

}

export = UiSplashScreenInterface;