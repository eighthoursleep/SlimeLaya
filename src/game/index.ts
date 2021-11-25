import {MainCtrl} from "./ctrl/MainCtrl";
import {StaticString} from "./def/StaticString";

var game = new MainCtrl();
export function start() {

    let complete = Laya.Handler.create(null,(scene)=>{
        game.initScene(Laya.stage.addChild(scene) as Laya.Scene3D);
        game.startGame();
    })
    Laya.Scene3D.load(StaticString.scene,complete);
}