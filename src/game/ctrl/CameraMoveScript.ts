import Script3D = Laya.Script3D;
import Vector3 = Laya.Vector3;
import Quaternion = Laya.Quaternion;
import BaseCamera = Laya.BaseCamera;
import Event = Laya.Event;
import Camera = Laya.Camera;

export class CameraMoveScript extends Script3D {

    protected _tempVector3: Vector3 = new Vector3();
    protected lastMouseX: number;
    protected lastMouseY: number;
    protected yawPitchRoll: Vector3 = new Vector3();
    protected resultRotation: Quaternion = new Quaternion();
    protected tempRotationZ: Quaternion = new Quaternion();
    protected tempRotationX: Quaternion = new Quaternion();
    protected tempRotationY: Quaternion = new Quaternion();
    protected isMouseDown: boolean;
    protected rotaionSpeed: number = 0.00006;
    protected camera: BaseCamera;

    speed: number = 0.01;

    constructor() {
        super();
    }

    /**
     * @private
     */
    protected _updateRotation(): void {
        if (Math.abs(this.yawPitchRoll.y) < 1.50) {
            Quaternion.createFromYawPitchRoll(this.yawPitchRoll.x, this.yawPitchRoll.y, this.yawPitchRoll.z, this.tempRotationZ);
            this.tempRotationZ.cloneTo(this.camera.transform.localRotation);
            this.camera.transform.localRotation = this.camera.transform.localRotation;
        }
    }

    onAwake(): void {
        Laya.stage.on(Laya.Event.RIGHT_MOUSE_DOWN, this, this.mouseDown);
        Laya.stage.on(Laya.Event.RIGHT_MOUSE_UP, this, this.mouseUp);
        //Laya.stage.on(Event.RIGHT_MOUSE_OUT, this, mouseOut);
        this.camera = (<Camera>this.owner);
    }

    onUpdate(): void {
        var elapsedTime: number = Laya.timer.delta;
        if (!isNaN(this.lastMouseX) && !isNaN(this.lastMouseY) && this.isMouseDown) {
            Laya.KeyBoardManager.hasKeyDown(87) && this.moveForward(-this.speed * elapsedTime);//W
            Laya.KeyBoardManager.hasKeyDown(83) && this.moveForward(this.speed * elapsedTime);//S
            Laya.KeyBoardManager.hasKeyDown(65) && this.moveRight(-this.speed * elapsedTime);//A
            Laya.KeyBoardManager.hasKeyDown(68) && this.moveRight(this.speed * elapsedTime);//D
            Laya.KeyBoardManager.hasKeyDown(81) && this.moveVertical(this.speed * elapsedTime);//Q
            Laya.KeyBoardManager.hasKeyDown(69) && this.moveVertical(-this.speed * elapsedTime);//E

            var offsetX: number = Laya.stage.mouseX - this.lastMouseX;
            var offsetY: number = Laya.stage.mouseY - this.lastMouseY;

            var yprElem: Vector3 = this.yawPitchRoll;
            yprElem.x -= offsetX * this.rotaionSpeed * elapsedTime;
            yprElem.y -= offsetY * this.rotaionSpeed * elapsedTime;
            this._updateRotation();
        }
        this.lastMouseX = Laya.stage.mouseX;
        this.lastMouseY = Laya.stage.mouseY;
    }

    onDestroy(): void {
        Laya.stage.off(Laya.Event.RIGHT_MOUSE_DOWN, this, this.mouseDown);
        Laya.stage.off(Laya.Event.RIGHT_MOUSE_UP, this, this.mouseUp);
        //Laya.stage.off(Event.RIGHT_MOUSE_OUT, this, mouseOut);
    }

    protected mouseDown(e: Event): void {
        this.camera.transform.localRotation.getYawPitchRoll(this.yawPitchRoll);

        this.lastMouseX = Laya.stage.mouseX;
        this.lastMouseY = Laya.stage.mouseY;
        this.isMouseDown = true;
    }

    protected mouseUp(e: Event): void {
        this.isMouseDown = false;
    }

    protected mouseOut(e: Event): void {
        this.isMouseDown = false;
    }

    /**
     * ???????????????
     * @param distance ???????????????
     */
    moveForward(distance: number): void {
        this._tempVector3.x = this._tempVector3.y = 0;
        this._tempVector3.z = distance;
        this.camera.transform.translate(this._tempVector3);
    }

    /**
     * ???????????????
     * @param distance ???????????????
     */
    moveRight(distance: number): void {
        this._tempVector3.y = this._tempVector3.z = 0;
        this._tempVector3.x = distance;
        this.camera.transform.translate(this._tempVector3);
    }

    /**
     * ???????????????
     * @param distance ???????????????
     */
    moveVertical(distance: number): void {
        this._tempVector3.x = this._tempVector3.z = 0;
        this._tempVector3.y = distance;
        this.camera.transform.translate(this._tempVector3, false);
    }

}


