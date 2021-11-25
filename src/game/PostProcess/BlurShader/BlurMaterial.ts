import Material = Laya.Material;
import BaseTexture = Laya.BaseTexture;
import Shader3D = Laya.Shader3D;
import Vector4 = Laya.Vector4;

export class BlurMaterial extends Material{
    static SHADERVALUE_MAINTEX:number = Shader3D.propertyNameToID("u_MainTex");
    static SHADERVALUE_TEXELSIZE:number = Shader3D.propertyNameToID("u_MainTex_TexelSize");
    static SHADERVALUE_DOWNSAMPLEVALUE:number = Shader3D.propertyNameToID("u_DownSampleValue");
    static SHADERVALUE_SOURCETEXTURE0:number = Shader3D.propertyNameToID("u_sourceTexture0");
    static ShADERVALUE_SOURCETEXTURE1:number = Shader3D.propertyNameToID("u_sourceTexture1");

    private texelSize:Vector4 = new Vector4();
    private doSamplevalue:number = 0;

    constructor(texelSize:Vector4,offset:number){
        super();
        this.setShaderName("blurEffect");
        this._shaderValues.setNumber(BlurMaterial.SHADERVALUE_DOWNSAMPLEVALUE,offset);
        this._shaderValues.setVector(BlurMaterial.SHADERVALUE_TEXELSIZE,texelSize);
    }

    sourceTexture(sourceTexture0:BaseTexture,sourceTexture1:BaseTexture){
        this._shaderValues.setTexture(BlurMaterial.SHADERVALUE_SOURCETEXTURE0,sourceTexture0);
        this._shaderValues.setTexture(BlurMaterial.ShADERVALUE_SOURCETEXTURE1,sourceTexture1);
    }
}