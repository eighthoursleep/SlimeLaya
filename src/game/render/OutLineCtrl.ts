import Camera = Laya.Camera;
import BaseRender = Laya.BaseRender;
import Material = Laya.Material;
import CommandBuffer = Laya.CommandBuffer;
import Viewport = Laya.Viewport;
import RenderTexture = Laya.RenderTexture;
import RenderTextureFormat = Laya.RenderTextureFormat;
import RenderTextureDepthFormat = Laya.RenderTextureDepthFormat;
import Vector4 = Laya.Vector4;
import FilterMode = Laya.FilterMode;

import {BlurMaterial} from "../PostProcess/BlurShader/BlurMaterial";

export enum OutlineSpriteType{
    MeshSprite3D,ShuriKenParticle3D,SkinnedMeshSprite3D
}

export class OutLineCtrl{
    static renders:Laya.BaseRender[] = [];
    static materials:Laya.Material[] = [];

    static pushRender(render:Laya.BaseRender){
        this.renders.push(render);
    }
    static pushMaterial(materail:Laya.Material){
        this.materials.push(materail);
    }

    static createDrawMeshCommandBuffer(camera:Camera):CommandBuffer{
        var buf:CommandBuffer = new CommandBuffer();
        //当需要在流程中拿摄像机渲染效果的时候 设置true
        camera.enableBuiltInRenderTexture = true;
        //创建和屏幕一样大的Rendertexture
        var viewPort:Viewport = camera.viewport;
        var renderTexture = RenderTexture.createFromPool(viewPort.width,viewPort.height,RenderTextureFormat.R8G8B8A8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
        //将RenderTexture设置为渲染目标
        buf.setRenderTarget(renderTexture);
        //清楚渲染目标的颜色为黑色，不清理深度
        buf.clearRenderTarget(true,false,new Vector4(0,0,0,0));

        //将传入的Render渲染到纹理上
        for(var i = 0,n = this.renders.length;i<n;i++){
            buf.drawRender(this.renders[i],this.materials[i],0);
        }
        //创建新的RenderTexture
        var subRendertexture = RenderTexture.createFromPool(viewPort.width,viewPort.height,RenderTextureFormat.R8G8B8A8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
        //将renderTexture的结果复制到subRenderTexture
        buf.blitScreenQuad(renderTexture,subRendertexture);
        //设置模糊的参数
        var downSampleFactor:number = 2;
        var downSampleWidth:number = viewPort.width/downSampleFactor;
        var downSampleheigh:number = viewPort.height/downSampleFactor;
        var texSize:Vector4 = new Vector4(1.0/viewPort.width,1.0/viewPort.height,viewPort.width,downSampleheigh);
        //创建模糊材质
        var blurMaterial:BlurMaterial = new BlurMaterial(texSize,1);

        //创建降采样RenderTexture1
        var downRenderTexture = RenderTexture.createFromPool(downSampleWidth,downSampleheigh,RenderTextureFormat.R8G8B8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
        //降采样  使用blurMaterial材质的0SubShader将Rendertexture渲染到DownRendertexture
        buf.blitScreenQuadByMaterial(renderTexture,downRenderTexture,null,blurMaterial,0);

        //创建降采样RenderTexture2
        var blurTexture:RenderTexture = RenderTexture.createFromPool(downSampleWidth,downSampleheigh,RenderTextureFormat.R8G8B8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
        blurTexture.filterMode = FilterMode.Bilinear;

        //Horizontal blur 使用blurMaterial材质的1SubShader
        buf.blitScreenQuadByMaterial(downRenderTexture,blurTexture,null,blurMaterial,1);
        //vertical blur	使用blurMaterial材质的2SubShader
        buf.blitScreenQuadByMaterial(blurTexture,downRenderTexture,null,blurMaterial,2);
        //Horizontal blur 使用blurMaterial材质的1SubShader
        buf.blitScreenQuadByMaterial(downRenderTexture,blurTexture,null,blurMaterial,1);
        //vertical blur   使用blurMaterial材质的2SubShader
        buf.blitScreenQuadByMaterial(blurTexture,downRenderTexture,null,blurMaterial,2);
        //在命令流里面插入设置图片命令流，在调用的时候会设置blurMaterial的图片数据
        buf.setShaderDataTexture(blurMaterial._shaderValues,BlurMaterial.SHADERVALUE_SOURCETEXTURE0,downRenderTexture);
        buf.setShaderDataTexture(blurMaterial._shaderValues,BlurMaterial.ShADERVALUE_SOURCETEXTURE1,subRendertexture);
        //caculate edge计算边缘图片
        buf.blitScreenQuadByMaterial(blurTexture,renderTexture,null,blurMaterial,3);
        //重新传入图片
        buf.setShaderDataTexture(blurMaterial._shaderValues,BlurMaterial.SHADERVALUE_SOURCETEXTURE0,renderTexture);
        //将camera渲染结果复制到subRendertexture，使用blurMaterial的4通道shader
        buf.blitScreenQuadByMaterial(null,subRendertexture,null,blurMaterial,4);
        //将subRenderTexture重新赋值到camera的渲染结果上面
        buf.blitScreenQuadByMaterial(subRendertexture,null);
        return buf;
    }
}