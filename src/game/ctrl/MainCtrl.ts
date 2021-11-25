import {OutLineCtrl, OutlineSpriteType} from "../render/OutLineCtrl";
import {BlurEffect} from "../PostProcess/BlurShader/BlurEffect";
import UnlitMaterial = Laya.UnlitMaterial;
import Vector4 = Laya.Vector4;
import CommandBuffer = Laya.CommandBuffer;
import CameraEventFlags = Laya.CameraEventFlags;
import MeshSprite3D = Laya.MeshSprite3D;
import {CameraMoveScript} from "./CameraMoveScript";
import SkinnedMeshSprite3D = Laya.SkinnedMeshSprite3D;

export class MainCtrl{
    camera:Laya.Camera;
    scene:Laya.Scene3D;

    private commandBuffer:CommandBuffer;
    private cameraEventFlag:CameraEventFlags = CameraEventFlags.BeforeImageEffect;
    private enableCommandBuffer:boolean = false;

    private character:Laya.Sprite3D;
    private anim:Laya.Animator;

    constructor() {
    }

    initScene(scene:Laya.Scene3D){
        this.scene = scene;
        this.camera = scene.getChildByName("MainCamera") as Laya.Camera;
    }

    startGame(){
        BlurEffect.init();
        // Shader3D.debugMode = true;
        this.camera.addComponent(CameraMoveScript);
        this.character = this.scene.getChildByName("Ethan") as Laya.Sprite3D;
        this.outlineObjs();
        this.anim = this.character.getComponent(Laya.Animator) as Laya.Animator;
        this.anim.play();
    }

    outlineObjs(){
        let unlitMaterial = new UnlitMaterial();//非粒子用UnlitMaterial
        unlitMaterial.albedoColor = new Vector4(255,0,0,255);
        let sphere:MeshSprite3D = this.scene.getChildByName("Sphere") as MeshSprite3D;
        OutLineCtrl.pushRender(sphere.meshRenderer);
        OutLineCtrl.pushMaterial(unlitMaterial);

        let unlitMaterialCube = new UnlitMaterial();
        unlitMaterialCube.albedoColor = new Vector4(255,0,0,255);
        let cube:MeshSprite3D = this.scene.getChildByName("Cube") as MeshSprite3D;
        OutLineCtrl.pushRender(cube.meshRenderer);
        OutLineCtrl.pushMaterial(unlitMaterialCube);

        let unlitMaterialCharacter = new UnlitMaterial();
        unlitMaterialCharacter.albedoColor = new Vector4(255,0,0,255);
        let character:SkinnedMeshSprite3D = this.character.getChildByName("EthanBody") as SkinnedMeshSprite3D;
        OutLineCtrl.pushRender(character.skinnedMeshRenderer);
        OutLineCtrl.pushMaterial(unlitMaterialCharacter);

        //创建commandBuffer
        this.commandBuffer =  OutLineCtrl.createDrawMeshCommandBuffer(this.camera);
        //将commandBuffer加入渲染流程
        this.camera.addCommandBuffer(this.cameraEventFlag,this.commandBuffer);
    }
}