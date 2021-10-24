import {MainCtrl} from "./ctrl/MainCtrl";
import {StaticString} from "./def/StaticString";

export function start() {
    let complete = Laya.Handler.create(null,(scene)=>{
        MainCtrl.scene = Laya.stage.addChild(scene) as Laya.Scene3D;
        MainCtrl.camera = MainCtrl.scene.getChildByName("MainCamera") as Laya.Camera;
    })
    Laya.Scene3D.load(StaticString.scene,complete);

}