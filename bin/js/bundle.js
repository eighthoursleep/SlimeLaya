(function () {
    'use strict';

    class GameConfig {
        constructor() {
        }
        static init() {
            var reg = Laya.ClassUtils.regClass;
        }
    }
    GameConfig.width = 1334;
    GameConfig.height = 750;
    GameConfig.scaleMode = "fixedwidth";
    GameConfig.screenMode = "horizontal";
    GameConfig.alignV = "top";
    GameConfig.alignH = "left";
    GameConfig.startScene = "";
    GameConfig.sceneRoot = "";
    GameConfig.debug = false;
    GameConfig.stat = false;
    GameConfig.physicsDebug = false;
    GameConfig.exportSceneToJson = true;
    GameConfig.init();

    var Material = Laya.Material;
    var Shader3D = Laya.Shader3D;
    var Vector4 = Laya.Vector4;
    class BlurMaterial extends Material {
        constructor(texelSize, offset) {
            super();
            this.texelSize = new Vector4();
            this.doSamplevalue = 0;
            this.setShaderName("blurEffect");
            this._shaderValues.setNumber(BlurMaterial.SHADERVALUE_DOWNSAMPLEVALUE, offset);
            this._shaderValues.setVector(BlurMaterial.SHADERVALUE_TEXELSIZE, texelSize);
        }
        sourceTexture(sourceTexture0, sourceTexture1) {
            this._shaderValues.setTexture(BlurMaterial.SHADERVALUE_SOURCETEXTURE0, sourceTexture0);
            this._shaderValues.setTexture(BlurMaterial.ShADERVALUE_SOURCETEXTURE1, sourceTexture1);
        }
    }
    BlurMaterial.SHADERVALUE_MAINTEX = Shader3D.propertyNameToID("u_MainTex");
    BlurMaterial.SHADERVALUE_TEXELSIZE = Shader3D.propertyNameToID("u_MainTex_TexelSize");
    BlurMaterial.SHADERVALUE_DOWNSAMPLEVALUE = Shader3D.propertyNameToID("u_DownSampleValue");
    BlurMaterial.SHADERVALUE_SOURCETEXTURE0 = Shader3D.propertyNameToID("u_sourceTexture0");
    BlurMaterial.ShADERVALUE_SOURCETEXTURE1 = Shader3D.propertyNameToID("u_sourceTexture1");

    var CommandBuffer = Laya.CommandBuffer;
    var RenderTexture = Laya.RenderTexture;
    var RenderTextureFormat = Laya.RenderTextureFormat;
    var RenderTextureDepthFormat = Laya.RenderTextureDepthFormat;
    var Vector4$1 = Laya.Vector4;
    var FilterMode = Laya.FilterMode;
    var OutlineSpriteType;
    (function (OutlineSpriteType) {
        OutlineSpriteType[OutlineSpriteType["MeshSprite3D"] = 0] = "MeshSprite3D";
        OutlineSpriteType[OutlineSpriteType["ShuriKenParticle3D"] = 1] = "ShuriKenParticle3D";
        OutlineSpriteType[OutlineSpriteType["SkinnedMeshSprite3D"] = 2] = "SkinnedMeshSprite3D";
    })(OutlineSpriteType || (OutlineSpriteType = {}));
    class OutLineCtrl {
        static pushRender(render) {
            this.renders.push(render);
        }
        static pushMaterial(materail) {
            this.materials.push(materail);
        }
        static createDrawMeshCommandBuffer(camera) {
            var buf = new CommandBuffer();
            camera.enableBuiltInRenderTexture = true;
            var viewPort = camera.viewport;
            var renderTexture = RenderTexture.createFromPool(viewPort.width, viewPort.height, RenderTextureFormat.R8G8B8A8, RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
            buf.setRenderTarget(renderTexture);
            buf.clearRenderTarget(true, false, new Vector4$1(0, 0, 0, 0));
            for (var i = 0, n = this.renders.length; i < n; i++) {
                buf.drawRender(this.renders[i], this.materials[i], 0);
            }
            var subRendertexture = RenderTexture.createFromPool(viewPort.width, viewPort.height, RenderTextureFormat.R8G8B8A8, RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
            buf.blitScreenQuad(renderTexture, subRendertexture);
            var downSampleFactor = 2;
            var downSampleWidth = viewPort.width / downSampleFactor;
            var downSampleheigh = viewPort.height / downSampleFactor;
            var texSize = new Vector4$1(1.0 / viewPort.width, 1.0 / viewPort.height, viewPort.width, downSampleheigh);
            var blurMaterial = new BlurMaterial(texSize, 1);
            var downRenderTexture = RenderTexture.createFromPool(downSampleWidth, downSampleheigh, RenderTextureFormat.R8G8B8, RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
            buf.blitScreenQuadByMaterial(renderTexture, downRenderTexture, null, blurMaterial, 0);
            var blurTexture = RenderTexture.createFromPool(downSampleWidth, downSampleheigh, RenderTextureFormat.R8G8B8, RenderTextureDepthFormat.DEPTHSTENCIL_NONE);
            blurTexture.filterMode = FilterMode.Bilinear;
            buf.blitScreenQuadByMaterial(downRenderTexture, blurTexture, null, blurMaterial, 1);
            buf.blitScreenQuadByMaterial(blurTexture, downRenderTexture, null, blurMaterial, 2);
            buf.blitScreenQuadByMaterial(downRenderTexture, blurTexture, null, blurMaterial, 1);
            buf.blitScreenQuadByMaterial(blurTexture, downRenderTexture, null, blurMaterial, 2);
            buf.setShaderDataTexture(blurMaterial._shaderValues, BlurMaterial.SHADERVALUE_SOURCETEXTURE0, downRenderTexture);
            buf.setShaderDataTexture(blurMaterial._shaderValues, BlurMaterial.ShADERVALUE_SOURCETEXTURE1, subRendertexture);
            buf.blitScreenQuadByMaterial(blurTexture, renderTexture, null, blurMaterial, 3);
            buf.setShaderDataTexture(blurMaterial._shaderValues, BlurMaterial.SHADERVALUE_SOURCETEXTURE0, renderTexture);
            buf.blitScreenQuadByMaterial(null, subRendertexture, null, blurMaterial, 4);
            buf.blitScreenQuadByMaterial(subRendertexture, null);
            return buf;
        }
    }
    OutLineCtrl.renders = [];
    OutLineCtrl.materials = [];

    var BlurVS = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n#include \"Lighting.glsl\";\nattribute vec4 a_PositionTexcoord;\nvarying vec2 v_Texcoord0;\n\nvoid main() {\n\tgl_Position = vec4(a_PositionTexcoord.xy, 0.0, 1.0);\n\tv_Texcoord0 = a_PositionTexcoord.zw;\n\tgl_Position = remapGLPositionZ(gl_Position);\n}";

    var BlurHorizentalFS = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n\nvarying vec2 v_Texcoord0;\nuniform sampler2D u_MainTex;\nuniform vec4 u_MainTex_TexelSize;\nuniform float u_DownSampleValue;\n\nvoid main()\n{\n    vec4 color = vec4(0.0,0.0,0.0,0.0);\n    vec2 uv = v_Texcoord0;\n    vec2 uvOffset = vec2(1.0,0.0)*u_MainTex_TexelSize.xy*u_DownSampleValue;\n    uv = uv - uvOffset*3.0;\n    //高斯参数\n    color+=0.0205*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0855*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.232*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.324*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.232*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0855*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0205*texture2D(u_MainTex,uv);\n\n    gl_FragColor = color;\n    \n\n    \n}";

    var BlurVerticalFS = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n\nvarying vec2 v_Texcoord0;\nuniform sampler2D u_MainTex;\nuniform vec4 u_MainTex_TexelSize;\nuniform float u_DownSampleValue;\n\nvoid main()\n{\n    vec4 color = vec4(0.0,0.0,0.0,0.0);\n    vec2 uv = v_Texcoord0;\n    vec2 uvOffset = vec2(0.0,1.0)*u_MainTex_TexelSize.xy*u_DownSampleValue;\n    uv = uv - uvOffset*3.0;\n    //高斯参数\n    color+=0.0205*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0855*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.232*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.324*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.232*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0855*texture2D(u_MainTex,uv);\n    uv+=uvOffset;\n    color+=0.0205*texture2D(u_MainTex,uv);\n\n    gl_FragColor = color;\n    \n\n    \n}";

    var BlurDownSampleFS = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n\nvarying vec2 v_Texcoord0;\nuniform sampler2D u_MainTex;\nuniform vec4 u_MainTex_TexelSize;\n\nvoid main()\n{\n    vec4 color = vec4(0.0,0.0,0.0,0.0);\n    color += texture2D(u_MainTex,v_Texcoord0+u_MainTex_TexelSize.xy*vec2(1.0,0.0));\n\tcolor += texture2D(u_MainTex,v_Texcoord0+u_MainTex_TexelSize.xy*vec2(-1.0,0.0));\n\tcolor += texture2D(u_MainTex,v_Texcoord0+u_MainTex_TexelSize.xy*vec2(0.0,-1.0));\n\tcolor += texture2D(u_MainTex,v_Texcoord0+u_MainTex_TexelSize.xy*vec2(0.0,1.0));\n    gl_FragColor = color/4.0;\n//     gl_FragColor = vec4(1.0,0.0,0.0,1.0);\n}";

    var BlurDownSampleVS = "#include \"Lighting.glsl\";\n#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\nattribute vec4 a_PositionTexcoord;\nvarying vec2 v_Texcoord0;\n\nvoid main() {\n\tgl_Position = vec4(a_PositionTexcoord.xy, 0.0, 1.0);\n\tv_Texcoord0 = a_PositionTexcoord.zw;\n\tgl_Position = remapGLPositionZ(gl_Position);\n}";

    var BlurEdgeAdd = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n\nvarying vec2 v_Texcoord0;\nuniform sampler2D u_MainTex;\nuniform sampler2D u_sourceTexture0;\n\nvoid main()\n{\n    vec2 uv = v_Texcoord0;\n    vec4 mainColor = texture2D(u_MainTex,uv);\n    vec4 sourceColor = texture2D(u_sourceTexture0,uv);\n    float factor = step(sourceColor.x+sourceColor.y+sourceColor.z,0.001);\n    vec4 color = mix(sourceColor,mainColor,factor);\n    gl_FragColor =color;\n}";

    var BlurEdgeSub = "#if defined(GL_FRAGMENT_PRECISION_HIGH)// 原来的写法会被我们自己的解析流程处理，而我们的解析是不认内置宏的，导致被删掉，所以改成 if defined 了\n\tprecision highp float;\n#else\n\tprecision mediump float;\n#endif\n\nvarying vec2 v_Texcoord0;\nuniform sampler2D u_sourceTexture0;\nuniform sampler2D u_sourceTexture1;\n\nvoid main()\n{\n    vec2 uv = v_Texcoord0;\n    vec4 blurColor = texture2D(u_sourceTexture0,uv);\n    vec4 clearColor = texture2D(u_sourceTexture1,uv);\n    float factor = step(clearColor.x+clearColor.y+clearColor.z,0.001);\n    vec4 color = blurColor*factor;\n    color = (1.0-step(color.x+color.y+color.z,0.15))*vec4(1.0,1.0,1.0,1.0);//改描边的颜色\n    gl_FragColor = color;\n}";

    var PostProcessEffect = Laya.PostProcessEffect;
    var VertexMesh = Laya.VertexMesh;
    var Shader3D$1 = Laya.Shader3D;
    var ShaderData = Laya.ShaderData;
    var SubShader = Laya.SubShader;
    var RenderState = Laya.RenderState;
    var RenderTexture$1 = Laya.RenderTexture;
    var RenderTextureDepthFormat$1 = Laya.RenderTextureDepthFormat;
    var RenderTextureFormat$1 = Laya.RenderTextureFormat;
    var FilterMode$1 = Laya.FilterMode;
    var Vector4$2 = Laya.Vector4;
    class BlurEffect extends PostProcessEffect {
        constructor() {
            super();
            this._shader = null;
            this._shaderData = new ShaderData();
            this._downSampleNum = 1;
            this._blurSpreadSize = 1;
            this._blurIterations = 2;
            this._texSize = new Vector4$2(1.0, 1.0, 1.0, 1.0);
            this._shader = Shader3D$1.find("blurEffect");
            this._tempRenderTexture = new Array(13);
        }
        static init() {
            var attributeMap = {
                'a_PositionTexcoord': VertexMesh.MESH_POSITION0
            };
            var uniformMap = {
                'u_MainTex': Shader3D$1.PERIOD_MATERIAL,
                'u_MainTex_TexelSize': Shader3D$1.PERIOD_MATERIAL,
                'u_DownSampleValue': Shader3D$1.PERIOD_MATERIAL,
                'u_sourceTexture0': Shader3D$1.PERIOD_MATERIAL,
                'u_sourceTexture1': Shader3D$1.PERIOD_MATERIAL
            };
            var shader = Shader3D$1.add("blurEffect");
            var subShader = new SubShader(attributeMap, uniformMap);
            shader.addSubShader(subShader);
            var shaderpass = subShader.addShaderPass(BlurDownSampleVS, BlurDownSampleFS);
            var renderState = shaderpass.renderState;
            renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
            renderState.depthWrite = false;
            renderState.cull = RenderState.CULL_NONE;
            renderState.blend = RenderState.BLEND_DISABLE;
            subShader = new SubShader(attributeMap, uniformMap);
            shader.addSubShader(subShader);
            shaderpass = subShader.addShaderPass(BlurVS, BlurVerticalFS);
            renderState = shaderpass.renderState;
            renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
            renderState.depthWrite = false;
            renderState.cull = RenderState.CULL_NONE;
            renderState.blend = RenderState.BLEND_DISABLE;
            subShader = new SubShader(attributeMap, uniformMap);
            shader.addSubShader(subShader);
            shaderpass = subShader.addShaderPass(BlurVS, BlurHorizentalFS);
            renderState = shaderpass.renderState;
            renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
            renderState.depthWrite = false;
            renderState.cull = RenderState.CULL_NONE;
            renderState.blend = RenderState.BLEND_DISABLE;
            subShader = new SubShader(attributeMap, uniformMap);
            shader.addSubShader(subShader);
            shaderpass = subShader.addShaderPass(BlurVS, BlurEdgeSub);
            renderState = shaderpass.renderState;
            renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
            renderState.depthWrite = false;
            renderState.cull = RenderState.CULL_NONE;
            renderState.blend = RenderState.BLEND_DISABLE;
            subShader = new SubShader(attributeMap, uniformMap);
            shader.addSubShader(subShader);
            shaderpass = subShader.addShaderPass(BlurVS, BlurEdgeAdd);
            renderState = shaderpass.renderState;
            renderState.depthTest = RenderState.DEPTHTEST_ALWAYS;
            renderState.depthWrite = false;
            renderState.cull = RenderState.CULL_NONE;
            renderState.blend = RenderState.BLEND_DISABLE;
        }
        get downSampleNum() {
            return this._downSampleNum;
        }
        set downSampleNum(value) {
            this._downSampleNum = Math.min(6, Math.max(value, 0.0));
        }
        get blurSpreadSize() {
            return this._blurSpreadSize;
        }
        set blurSpreadSize(value) {
            this._blurSpreadSize = Math.min(10, Math.max(value, 1.0));
        }
        get blurIterations() {
            return this._blurIterations;
        }
        set blurIterations(value) {
            this._blurIterations = Math.min(Math.max(value, 0.0), 6.0);
        }
        render(context) {
            var cmd = context.command;
            var viewport = context.camera.viewport;
            var scaleFactor = 1.0 / (1 << Math.floor(this._downSampleNum));
            var tw = Math.floor(viewport.width * scaleFactor);
            var th = Math.floor(viewport.height * scaleFactor);
            this._texSize.setValue(1.0 / tw, 1.0 / th, tw, th);
            this._shaderData.setNumber(BlurEffect.SHADERVALUE_DOWNSAMPLEVALUE, this.blurSpreadSize);
            this._shaderData.setVector(BlurEffect.SHADERVALUE_TEXELSIZE, this._texSize);
            var downSampleTexture = RenderTexture$1.createFromPool(tw, th, RenderTextureFormat$1.R8G8B8, RenderTextureDepthFormat$1.DEPTHSTENCIL_NONE);
            downSampleTexture.filterMode = FilterMode$1.Bilinear;
            this._tempRenderTexture[0] = downSampleTexture;
            var lastDownTexture = context.source;
            cmd.blitScreenTriangle(lastDownTexture, downSampleTexture, null, this._shader, this._shaderData, 0);
            lastDownTexture = downSampleTexture;
            for (var i = 0; i < this._blurIterations; i++) {
                var blurTexture = RenderTexture$1.createFromPool(tw, th, RenderTextureFormat$1.R8G8B8, RenderTextureDepthFormat$1.DEPTHSTENCIL_NONE);
                blurTexture.filterMode = FilterMode$1.Bilinear;
                cmd.blitScreenTriangle(lastDownTexture, blurTexture, null, this._shader, this._shaderData, 1);
                lastDownTexture = blurTexture;
                this._tempRenderTexture[i * 2 + 1] = blurTexture;
                blurTexture = RenderTexture$1.createFromPool(tw, th, RenderTextureFormat$1.R8G8B8, RenderTextureDepthFormat$1.DEPTHSTENCIL_NONE);
                blurTexture.filterMode = FilterMode$1.Bilinear;
                cmd.blitScreenTriangle(lastDownTexture, blurTexture, null, this._shader, this._shaderData, 2);
                lastDownTexture = blurTexture;
                this._tempRenderTexture[i * 2 + 2] = blurTexture;
            }
            context.source = lastDownTexture;
            var maxTexture = this._blurIterations * 2 + 1;
            for (i = 0; i < maxTexture; i++) {
                RenderTexture$1.recoverToPool(this._tempRenderTexture[i]);
            }
            context.deferredReleaseTextures.push(lastDownTexture);
        }
    }
    BlurEffect.BLUR_TYPE_GaussianBlur = 0;
    BlurEffect.BLUR_TYPE_Simple = 1;
    BlurEffect.SHADERVALUE_MAINTEX = Shader3D$1.propertyNameToID("u_MainTex");
    BlurEffect.SHADERVALUE_TEXELSIZE = Shader3D$1.propertyNameToID("u_MainTex_TexelSize");
    BlurEffect.SHADERVALUE_DOWNSAMPLEVALUE = Shader3D$1.propertyNameToID("u_DownSampleValue");

    var Script3D = Laya.Script3D;
    var Vector3 = Laya.Vector3;
    var Quaternion = Laya.Quaternion;
    class CameraMoveScript extends Script3D {
        constructor() {
            super();
            this._tempVector3 = new Vector3();
            this.yawPitchRoll = new Vector3();
            this.resultRotation = new Quaternion();
            this.tempRotationZ = new Quaternion();
            this.tempRotationX = new Quaternion();
            this.tempRotationY = new Quaternion();
            this.rotaionSpeed = 0.00006;
            this.speed = 0.01;
        }
        _updateRotation() {
            if (Math.abs(this.yawPitchRoll.y) < 1.50) {
                Quaternion.createFromYawPitchRoll(this.yawPitchRoll.x, this.yawPitchRoll.y, this.yawPitchRoll.z, this.tempRotationZ);
                this.tempRotationZ.cloneTo(this.camera.transform.localRotation);
                this.camera.transform.localRotation = this.camera.transform.localRotation;
            }
        }
        onAwake() {
            Laya.stage.on(Laya.Event.RIGHT_MOUSE_DOWN, this, this.mouseDown);
            Laya.stage.on(Laya.Event.RIGHT_MOUSE_UP, this, this.mouseUp);
            this.camera = this.owner;
        }
        onUpdate() {
            var elapsedTime = Laya.timer.delta;
            if (!isNaN(this.lastMouseX) && !isNaN(this.lastMouseY) && this.isMouseDown) {
                Laya.KeyBoardManager.hasKeyDown(87) && this.moveForward(-this.speed * elapsedTime);
                Laya.KeyBoardManager.hasKeyDown(83) && this.moveForward(this.speed * elapsedTime);
                Laya.KeyBoardManager.hasKeyDown(65) && this.moveRight(-this.speed * elapsedTime);
                Laya.KeyBoardManager.hasKeyDown(68) && this.moveRight(this.speed * elapsedTime);
                Laya.KeyBoardManager.hasKeyDown(81) && this.moveVertical(this.speed * elapsedTime);
                Laya.KeyBoardManager.hasKeyDown(69) && this.moveVertical(-this.speed * elapsedTime);
                var offsetX = Laya.stage.mouseX - this.lastMouseX;
                var offsetY = Laya.stage.mouseY - this.lastMouseY;
                var yprElem = this.yawPitchRoll;
                yprElem.x -= offsetX * this.rotaionSpeed * elapsedTime;
                yprElem.y -= offsetY * this.rotaionSpeed * elapsedTime;
                this._updateRotation();
            }
            this.lastMouseX = Laya.stage.mouseX;
            this.lastMouseY = Laya.stage.mouseY;
        }
        onDestroy() {
            Laya.stage.off(Laya.Event.RIGHT_MOUSE_DOWN, this, this.mouseDown);
            Laya.stage.off(Laya.Event.RIGHT_MOUSE_UP, this, this.mouseUp);
        }
        mouseDown(e) {
            this.camera.transform.localRotation.getYawPitchRoll(this.yawPitchRoll);
            this.lastMouseX = Laya.stage.mouseX;
            this.lastMouseY = Laya.stage.mouseY;
            this.isMouseDown = true;
        }
        mouseUp(e) {
            this.isMouseDown = false;
        }
        mouseOut(e) {
            this.isMouseDown = false;
        }
        moveForward(distance) {
            this._tempVector3.x = this._tempVector3.y = 0;
            this._tempVector3.z = distance;
            this.camera.transform.translate(this._tempVector3);
        }
        moveRight(distance) {
            this._tempVector3.y = this._tempVector3.z = 0;
            this._tempVector3.x = distance;
            this.camera.transform.translate(this._tempVector3);
        }
        moveVertical(distance) {
            this._tempVector3.x = this._tempVector3.z = 0;
            this._tempVector3.y = distance;
            this.camera.transform.translate(this._tempVector3, false);
        }
    }

    var UnlitMaterial = Laya.UnlitMaterial;
    var Vector4$3 = Laya.Vector4;
    var CameraEventFlags = Laya.CameraEventFlags;
    class MainCtrl {
        constructor() {
            this.cameraEventFlag = CameraEventFlags.BeforeImageEffect;
            this.enableCommandBuffer = false;
        }
        initScene(scene) {
            this.scene = scene;
            this.camera = scene.getChildByName("MainCamera");
        }
        startGame() {
            BlurEffect.init();
            this.camera.addComponent(CameraMoveScript);
            this.character = this.scene.getChildByName("Ethan");
            this.outlineObjs();
            this.anim = this.character.getComponent(Laya.Animator);
            this.anim.play();
        }
        outlineObjs() {
            let unlitMaterial = new UnlitMaterial();
            unlitMaterial.albedoColor = new Vector4$3(255, 0, 0, 255);
            let sphere = this.scene.getChildByName("Sphere");
            OutLineCtrl.pushRender(sphere.meshRenderer);
            OutLineCtrl.pushMaterial(unlitMaterial);
            let unlitMaterialCube = new UnlitMaterial();
            unlitMaterialCube.albedoColor = new Vector4$3(255, 0, 0, 255);
            let cube = this.scene.getChildByName("Cube");
            OutLineCtrl.pushRender(cube.meshRenderer);
            OutLineCtrl.pushMaterial(unlitMaterialCube);
            let unlitMaterialCharacter = new UnlitMaterial();
            unlitMaterialCharacter.albedoColor = new Vector4$3(255, 0, 0, 255);
            let character = this.character.getChildByName("EthanBody");
            OutLineCtrl.pushRender(character.skinnedMeshRenderer);
            OutLineCtrl.pushMaterial(unlitMaterialCharacter);
            this.commandBuffer = OutLineCtrl.createDrawMeshCommandBuffer(this.camera);
            this.camera.addCommandBuffer(this.cameraEventFlag, this.commandBuffer);
        }
    }

    class StaticString {
    }
    StaticString.scene = "unitylib/Conventional/MainScene.ls";

    var game = new MainCtrl();
    function start() {
        let complete = Laya.Handler.create(null, (scene) => {
            game.initScene(Laya.stage.addChild(scene));
            game.startGame();
        });
        Laya.Scene3D.load(StaticString.scene, complete);
    }

    class Main {
        constructor() {
            if (window["Laya3D"])
                Laya3D.init(GameConfig.width, GameConfig.height);
            else
                Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
            Laya["Physics"] && Laya["Physics"].enable();
            Laya["DebugPanel"] && Laya["DebugPanel"].enable();
            Laya.stage.scaleMode = GameConfig.scaleMode;
            Laya.stage.screenMode = GameConfig.screenMode;
            Laya.stage.alignV = GameConfig.alignV;
            Laya.stage.alignH = GameConfig.alignH;
            Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;
            if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true")
                Laya.enableDebugPanel();
            if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"])
                Laya["PhysicsDebugDraw"].enable();
            if (GameConfig.stat)
                Laya.Stat.show();
            Laya.alertGlobalError(true);
            Laya.Stat.show();
            Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
        }
        onVersionLoaded() {
            Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
        }
        onConfigLoaded() {
            GameConfig.startScene && Laya.Scene.open(GameConfig.startScene);
            start();
        }
    }
    new Main();

}());
