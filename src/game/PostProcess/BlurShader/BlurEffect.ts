import PostProcessEffect = Laya.PostProcessEffect;
import VertexMesh = Laya.VertexMesh;
import Shader3D = Laya.Shader3D;
import ShaderData = Laya.ShaderData;
import PostProcessRenderContext = Laya.PostProcessRenderContext;
import SubShader = Laya.SubShader;
import RenderState = Laya.RenderState;
import ShaderPass = Laya.ShaderPass;
import CommandBuffer = Laya.CommandBuffer;
import Viewport = Laya.Viewport;
import RenderTexture = Laya.RenderTexture;

import RenderTextureDepthFormat = Laya.RenderTextureDepthFormat;
import RenderTextureFormat = Laya.RenderTextureFormat;
import FilterMode = Laya.FilterMode;
import Vector4 = Laya.Vector4;
import BlurVS from "./shaders/Blur.vs";
import BlurHorizentalFS from "./shaders/BlurHorizontal.fs";
import BlurVerticalFS from "./shaders/BlurVertical.fs";
import BlurDownSampleFS from "./shaders/BlurDownSample.fs";
import BlurDownSampleVS from "./shaders/BlurDownSample.vs";
import BlurEdgeAdd from "./shaders/EdgeAdd.fs";
import BlurEdgeSub from "./shaders/EdgeSub.fs";


export class BlurEffect extends PostProcessEffect{
    static BLUR_TYPE_GaussianBlur:number = 0;
    static BLUR_TYPE_Simple:number = 1;
    static SHADERVALUE_MAINTEX:number = Shader3D.propertyNameToID("u_MainTex");
    static SHADERVALUE_TEXELSIZE:number = Shader3D.propertyNameToID("u_MainTex_TexelSize");
    static SHADERVALUE_DOWNSAMPLEVALUE:number = Shader3D.propertyNameToID("u_DownSampleValue");
   
    static init(){
         //初始化shader
        var attributeMap:any = {
			'a_PositionTexcoord': VertexMesh.MESH_POSITION0
        };
        var uniformMap = {
            'u_MainTex': Shader3D.PERIOD_MATERIAL,
            'u_MainTex_TexelSize':Shader3D.PERIOD_MATERIAL,
            'u_DownSampleValue':Shader3D.PERIOD_MATERIAL,
            'u_sourceTexture0':Shader3D.PERIOD_MATERIAL,
            'u_sourceTexture1':Shader3D.PERIOD_MATERIAL
        }
        var shader:Shader3D = Shader3D.add("blurEffect");
        //subShader0  降采样
        var subShader:SubShader = new SubShader(attributeMap,uniformMap);
        shader.addSubShader(subShader);
        var shaderpass:ShaderPass = subShader.addShaderPass(BlurDownSampleVS,BlurDownSampleFS);
        var renderState:RenderState = shaderpass.renderState;
        renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
        renderState.depthWrite = false;
        renderState.cull = RenderState.CULL_NONE;
        renderState.blend = RenderState.BLEND_DISABLE;
        //subShader1 垂直反向模糊
        subShader = new SubShader(attributeMap,uniformMap);
        shader.addSubShader(subShader);
        shaderpass = subShader.addShaderPass(BlurVS,BlurVerticalFS);
        renderState = shaderpass.renderState;
        renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
        renderState.depthWrite = false;
        renderState.cull = RenderState.CULL_NONE;
        renderState.blend = RenderState.BLEND_DISABLE;
        //subShader2 水平方向模糊
        subShader = new SubShader(attributeMap,uniformMap);
        shader.addSubShader(subShader);
        shaderpass = subShader.addShaderPass(BlurVS,BlurHorizentalFS);
        renderState = shaderpass.renderState;
        renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
        renderState.depthWrite = false;
        renderState.cull = RenderState.CULL_NONE;
        renderState.blend = RenderState.BLEND_DISABLE;
        //subShader3 subTexture
        subShader = new SubShader(attributeMap,uniformMap);
        shader.addSubShader(subShader);
        shaderpass = subShader.addShaderPass(BlurVS,BlurEdgeSub);
        renderState = shaderpass.renderState;
        renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
        renderState.depthWrite = false;
        renderState.cull = RenderState.CULL_NONE;
        renderState.blend = RenderState.BLEND_DISABLE;
        //subShader4 addTexture
        subShader = new SubShader(attributeMap,uniformMap);
        shader.addSubShader(subShader);
        shaderpass = subShader.addShaderPass(BlurVS,BlurEdgeAdd);
        renderState = shaderpass.renderState;
        renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
        renderState.depthWrite = false;
        renderState.cull = RenderState.CULL_NONE;
        renderState.blend = RenderState.BLEND_DISABLE;
        
    }
    
    /**@internal */
    private _shader: Shader3D = null;
    /**@internal */
    private _shaderData: ShaderData = new ShaderData();
    /**@internal */
    private _downSampleNum:number = 1;
    /**@internal */
    private _blurSpreadSize:number = 1;
    /**@internal */
    private _blurIterations:number = 2;
    /**@internal */
    private _texSize:Vector4 = new Vector4(1.0,1.0,1.0,1.0);
    /**@internal */
    private _tempRenderTexture:any[];

    constructor(){
        super();
        this._shader = Shader3D.find("blurEffect");
        this._tempRenderTexture = new Array(13);
    }

    /**
	 * @return 强度。
	 */
	get downSampleNum(): number {
		return this._downSampleNum;
	}

	/**
	 * 降采样,值范围为0-6。
	 * @param value 强度。
	 */
	set downSampleNum(value: number) {
		this._downSampleNum =Math.min(6, Math.max(value, 0.0));
	}

	/**
	 * 采样间隔  过大会失真1-10
	 * @return 。
	 */
	get blurSpreadSize(): number {
		return this._blurSpreadSize;
	}

	/**
	 * @param value 
	 */
	set blurSpreadSize(value: number) {
		this._blurSpreadSize = Math.min(10, Math.max(value, 1.0));
	}

	/**
	 * 迭代次数  越大性能消耗越大 效果越好
	 * @return 。
	 */
	get blurIterations(): number {
		return this._blurIterations;
	}

	/**
	 * @param value。
	 */
	set blurIterations(value: number) {
		this._blurIterations = Math.min(Math.max(value, 0.0), 6.0);
	}

    /**
	 * @inheritDoc
	 * @override
	 * @internal
	 */
    render(context:PostProcessRenderContext):void{
        var cmd:CommandBuffer = context.command;
        var viewport:Viewport = context.camera.viewport;
        var scaleFactor:number = 1.0/(1<<Math.floor(this._downSampleNum));
        var tw:number = Math.floor( viewport.width*scaleFactor);
        var th:number = Math.floor(viewport.height*scaleFactor);
        this._texSize.setValue(1.0/tw,1.0/th,tw,th);
        //赋值
        this._shaderData.setNumber(BlurEffect.SHADERVALUE_DOWNSAMPLEVALUE,this.blurSpreadSize);
        this._shaderData.setVector(BlurEffect.SHADERVALUE_TEXELSIZE,this._texSize);
        //降采样
        var downSampleTexture:RenderTexture = RenderTexture.createFromPool(tw,th,RenderTextureFormat.R8G8B8, RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
        downSampleTexture.filterMode = FilterMode.Bilinear;
        this._tempRenderTexture[0] = downSampleTexture;
        var lastDownTexture:RenderTexture = context.source;
        cmd.blitScreenTriangle(lastDownTexture,downSampleTexture,null,this._shader,this._shaderData,0);
        lastDownTexture = downSampleTexture;
        //迭代次数
        for(var i:number = 0;i<this._blurIterations;i++){
           //vertical
            var blurTexture:RenderTexture = RenderTexture.createFromPool(tw,th,RenderTextureFormat.R8G8B8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
           blurTexture.filterMode = FilterMode.Bilinear;
           cmd.blitScreenTriangle(lastDownTexture,blurTexture,null,this._shader,this._shaderData,1);
           lastDownTexture = blurTexture;
           this._tempRenderTexture[i*2+1] = blurTexture;
           //Horizental
           blurTexture = RenderTexture.createFromPool(tw,th,RenderTextureFormat.R8G8B8,RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
           blurTexture.filterMode = FilterMode.Bilinear;
           cmd.blitScreenTriangle(lastDownTexture,blurTexture,null,this._shader,this._shaderData,2);
           lastDownTexture = blurTexture;
           this._tempRenderTexture[i*2+2] = blurTexture;
        }
        context.source = lastDownTexture;
        var maxTexture = this._blurIterations*2+1;
        //释放渲染纹理
		for (i = 0; i < maxTexture; i++) {
			RenderTexture.recoverToPool(this._tempRenderTexture[i]);
		}
        context.deferredReleaseTextures.push(lastDownTexture);
    }
}