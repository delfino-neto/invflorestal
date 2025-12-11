import { Coordinate, XlsxReaderService } from '@/shared/components/globe/service/XlsxReader.service';
import { Component, inject, OnInit } from '@angular/core';
import * as Cesium from 'cesium';

@Component({
    selector: 'app-globe-map',
    template: `
      <div id="cesiumContainer" style="width: 100%; height: 400px;"></div>
  `
})
export class GlobeComponent implements OnInit {
    private viewer?: Cesium.Viewer;

    constructor() {
        (window as any).CESIUM_BASE_URL = '/assets/cesium/';
    }

    private xlsxReader = inject(XlsxReaderService);

    public async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) {
            // Nenhum arquivo selecionado; abortando
            return;
        }
        const file = input.files[0];

        try {
            // Ler e processar o arquivo
            const coordinates = await this.xlsxReader.getCoordinatesFromFile(file);
            this.createBeamsFromCoordinates(coordinates);

        } catch (error) {
            console.error("Falha ao carregar coordenadas do arquivo.", error);
        }
    }

    async ngOnInit(): Promise<void> {
        Cesium.Ion.defaultAccessToken = 'seu-token-aqui';

        this.viewer = new Cesium.Viewer('cesiumContainer', {
            imageryProviderViewModels: [],
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            skyAtmosphere: false,
            navigationHelpButton: false,
            skyBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
            fullscreenButton: false
        });

        const scene = this.viewer.scene;

        const darkOSM = new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c', 'd'],
            credit: '© OpenStreetMap contributors © CARTO'
        });
        this.viewer.imageryLayers.addImageryProvider(darkOSM);

        scene.backgroundColor = Cesium.Color.fromCssColorString('#1a1c1f');
        scene.fog.enabled = false;

        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-20.0, -15.0, 15000000.0),
            duration: 3.5
        });
    }

    private beamMaterial?: Cesium.Material;
    private removePreRenderListener?: () => void;

    private createBeamsFromCoordinates(coordinates: Coordinate[]): void {
        if (!this.viewer) return;

        const beamColor = Cesium.Color.fromCssColorString('#00ff00');

        const instances = [];

        for (let i = 0; i < coordinates.length; i++) {
            const lon = -55 + Math.random() * 16;
            const lat = -27 + Math.random() * 24;
            const height = 16000 + Math.random() * 400000;
            const radius = 8000 + Math.random() * 7000;

            const position = Cesium.Cartesian3.fromDegrees(coordinates[i].lon, coordinates[i].lat, height / 2);
            const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
                position,
                new Cesium.HeadingPitchRoll(0, 0, 0)
            );

            instances.push(new Cesium.GeometryInstance({
                geometry: new Cesium.CylinderGeometry({
                    length: height,
                    topRadius: 0,
                    bottomRadius: radius,
                }),
                modelMatrix: modelMatrix
            }));
        }

        this.beamMaterial = new Cesium.Material({
            fabric: {
                uniforms: {
                    color: beamColor,
                    fadeFactor: 1.5,
                    glowPower: 0.5,
                    time: 0.0
                },
                source: `
        // --- Funções de Ruído (Corpo Completo) ---
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
        }

        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        // --- Função Principal ---
        czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;

            float verticalFade = pow(1.0 - st.t, fadeFactor);
            float pulse = sin(time * 2.0) * 0.5 + 1.0;
            float glow = glowPower * pulse;

            vec2 noiseCoord = vec2(st.s * 0.5, st.t * 2.0 - time * 0.4);
            float auroraNoise = fbm(noiseCoord);
            vec2 sparkleNoiseCoord = vec2(st.s * 2.0, st.t * 5.0 - time * 1.5);
            float sparkleNoise = noise(sparkleNoiseCoord);
            float combinedNoise = smoothstep(0.4, 0.8, auroraNoise + sparkleNoise * 0.2);
            
            float baseGlow = smoothstep(0.05, 0.0, st.t) * 2.5;
            float baseAlpha = 0.2; 
            float auroraEffect = combinedNoise * 0.5;

            material.alpha = verticalFade * (baseAlpha + auroraEffect + baseGlow) * glow;
            material.diffuse = color.rgb;
            material.emission = color.rgb * (baseAlpha + auroraEffect + baseGlow) * glow * verticalFade;

            return material;
        }`
            },
            translucent: true
        });

        const beamPrimitive = new Cesium.Primitive({
            geometryInstances: instances,
            appearance: new Cesium.MaterialAppearance({
                material: this.beamMaterial,
                translucent: true,
                faceForward: true
            }),
            asynchronous: false
        });

        this.viewer.scene.primitives.add(beamPrimitive);

        const startTime = performance.now();
        this.removePreRenderListener = this.viewer.scene.preRender.addEventListener(() => {
            if (this.beamMaterial) {
                this.beamMaterial.uniforms.time = (performance.now() - startTime) / 1000.0;
            }
        });
    }
}