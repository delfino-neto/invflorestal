import { Coordinate, XlsxReaderService } from '@/shared/components/globe/service/XlsxReader.service';
import { Component, inject, OnInit } from '@angular/core';
import * as Cesium from 'cesium';
const FadeOutBeamType = 'FadeOutBeam';
const FadeOutBeamSource = `
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

    float baseAlpha = 0.3; 
    float auroraEffect = combinedNoise * 0.5;

    material.alpha = verticalFade * (baseAlpha + auroraEffect) * glow;
    material.diffuse = color.rgb;
    material.emission = color.rgb * (baseAlpha + auroraEffect) * glow * verticalFade * 1.5;

    return material;
  }
`;
// const FadeOutBeamSource = `
//   // =========================================================================
//   // FUNÇÕES DE RUÍDO PROCEDURAL (NOISE) - Inalteradas
//   // =========================================================================
//   float random(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
//   }

//   float noise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);
//     float a = random(i);
//     float b = random(i + vec2(1.0, 0.0));
//     float c = random(i + vec2(0.0, 1.0));
//     float d = random(i + vec2(1.0, 1.0));
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
//   }

//   float fbm(vec2 st) {
//     float value = 0.0;
//     float amplitude = 0.5;
//     // A variável 'frequency' não era usada e foi removida.
//     for (int i = 0; i < 4; i++) {
//       value += amplitude * noise(st);
//       st *= 2.0;
//       amplitude *= 0.5;
//     }
//     return value;
//   }

//   // =========================================================================
//   // FUNÇÃO PRINCIPAL DO MATERIAL - COM LÓGICA REVISADA
//   // =========================================================================
//   czm_material czm_getMaterial(czm_materialInput materialInput) {
//     czm_material material = czm_getDefaultMaterial(materialInput);
//     vec2 st = materialInput.st;

//     // --- CÁLCULOS DOS EFEITOS ---

//     // 1. FADE VERTICAL: Controla a opacidade do topo.
//     float verticalFade = pow(1.0 - st.t, fadeFactor);

//     // 2. PULSO DE BRILHO: Controla a intensidade geral da luz.
//     float pulse = sin(time * 2.0) * 0.5 + 1.0;
//     float glow = glowPower * pulse;

//     // 3. RUÍDO DE AURORA: Gera a textura animada (lógica inalterada).
//     vec2 noiseCoord = vec2(st.s * 0.5, st.t * 2.0 - time * 0.4);
//     float auroraNoise = fbm(noiseCoord);
//     vec2 sparkleNoiseCoord = vec2(st.s * 2.0, st.t * 5.0 - time * 1.5);
//     float sparkleNoise = noise(sparkleNoiseCoord);
//     float combinedNoise = smoothstep(0.4, 0.8, auroraNoise + sparkleNoise * 0.2);

//     // --- APLICAÇÃO FINAL REVISADA (A MÁGICA ACONTECE AQUI) ---

//     // ✅ LÓGICA REVISADA: "CORPO + ANIMAÇÃO"
//     // Definimos uma opacidade base para o núcleo do raio (ex: 20%).
//     float baseAlpha = 0.2; 
//     // A animação da aurora adiciona opacidade sobre essa base.
//     float auroraEffect = combinedNoise * 0.5; // '0.5' controla a força da aurora.

//     // A transparência final é a SOMA do corpo e da animação, tudo afetado pelo fade.
//     // Isso garante que o raio nunca desapareça, apenas tenha a textura por cima.
//     material.alpha = verticalFade * (baseAlpha + auroraEffect) * glow;

//     // A cor base é a cor que passamos.
//     material.diffuse = color.rgb;
    
//     // A emissão de luz também segue a mesma lógica aditiva.
//     // O corpo inteiro brilha um pouco, e a aurora brilha mais intensamente por cima.
//     material.emission = color.rgb * (baseAlpha + auroraEffect) * glow * verticalFade;

//     return material;
//   }
// `;
// const FadeOutBeamSource = `
//   // =========================================================================
//   // FUNÇÕES DE RUÍDO PROCEDURAL (NOISE)
//   // Estas funções geram padrões pseudo-aleatórios que usaremos para o efeito.
//   // =========================================================================

//   // Função que gera um valor "aleatório" a partir de uma coordenada 2D.
//   float random(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
//   }

//   // Função de Ruído de Valor (Value Noise). Interpola suavemente os valores aleatórios.
//   float noise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);

//     float a = random(i);
//     float b = random(i + vec2(1.0, 0.0));
//     float c = random(i + vec2(0.0, 1.0));
//     float d = random(i + vec2(1.0, 1.0));

//     // Interpolação cúbica suave (smoothstep)
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
//   }

//   // Fractal Brownian Motion (fBm): Sobrepõe várias camadas de ruído
//   // para criar um padrão detalhado e natural, como nuvens ou auroras.
//   float fbm(vec2 st) {
//     float value = 0.0;
//     float amplitude = 0.5;
//     float frequency = 0.0;

//     // 4 "oitavas" de ruído para criar detalhes
//     for (int i = 0; i < 4; i++) {
//       value += amplitude * noise(st);
//       st *= 2.0; // Aumenta a frequência
//       amplitude *= 0.5; // Diminui a amplitude
//     }
//     return value;
//   }

//   // =========================================================================
//   // FUNÇÃO PRINCIPAL DO MATERIAL
//   // =========================================================================
//   czm_material czm_getMaterial(czm_materialInput materialInput) {
//     czm_material material = czm_getDefaultMaterial(materialInput);
//     vec2 st = materialInput.st;

//     // --- CÁLCULOS DO EFEITO ---

//     // 1. Fade vertical principal (como antes): garante que o raio desapareça no topo.
//     float verticalFade = pow(1.0 - st.t, fadeFactor);

//     // 2. Animação de pulso (como antes): para o brilho geral.
//     float pulse = sin(time * 2.0) * 0.5 + 1.0; // Modificado para ser um pouco mais brilhante
//     float glow = glowPower * pulse;

//     // 3. EFEITO DE AURORA (A GRANDE MUDANÇA):
//     //    - Criamos coordenadas de ruído que se movem com o tempo de forma complexa.
//     //    - A coordenada horizontal (st.s) é esticada para criar "fitas" verticais.
//     //    - A coordenada vertical (st.t) se move para cima com o tempo.
//     vec2 noiseCoord = vec2(st.s * 0.5, st.t * 2.0 - time * 0.4);
//     float auroraNoise = fbm(noiseCoord);

//     //    - Adicionamos um segundo ruído, mais rápido e sutil, para criar "faíscas".
//     vec2 sparkleNoiseCoord = vec2(st.s * 2.0, st.t * 5.0 - time * 1.5);
//     float sparkleNoise = noise(sparkleNoiseCoord);

//     // Combina os ruídos. O ruído principal é a base, e o de faíscas adiciona detalhes.
//     // O 'smoothstep' cria bordas mais definidas e menos "esfumaçadas".
//     float combinedNoise = smoothstep(0.4, 0.8, auroraNoise + sparkleNoise * 0.2);

//     // --- APLICAÇÃO FINAL ---

//     // A transparência final é o fade vertical MULTIPLICADO pelo nosso ruído de aurora.
//     // Isso faz com que o padrão de ruído "se dissolva" à medida que sobe.
//     material.alpha = verticalFade * combinedNoise * (0.3 + glow);
    
//     // A cor base e a emissão de luz também são afetadas pelo ruído,
//     // fazendo com que apenas as partes "visíveis" da aurora brilhem.
//     material.diffuse = color.rgb;
//     material.emission = color.rgb * glow * 2.0 * combinedNoise * verticalFade;

//     return material;
//   }
// `;

(Cesium.Material as any)._materialCache.addMaterial(FadeOutBeamType, {
  fabric: {
    type: FadeOutBeamType,
    uniforms: {
      color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
      fadeFactor: 1.5,
      glowPower: 0.3,
      time: 0.0
    },
    source: FadeOutBeamSource
  },
  translucent: true
});

class FadeOutBeamMaterialProperty {
  public isConstant = false;
  public definitionChanged = new Cesium.Event();
  private _startTime = performance.now();
  
  private _options: { color: Cesium.Color; fadeFactor: number; glowPower: number; };

  constructor(options: { color: Cesium.Color; fadeFactor: number; glowPower: number }) {
    this._options = options;
  }

  getType(time: Cesium.JulianDate): string {
    return FadeOutBeamType;
  }

  getValue(time: Cesium.JulianDate, result?: any): object {
    if (!result) {
      result = {};
    }

    result.color = this._options.color;
    result.fadeFactor = this._options.fadeFactor;
    result.glowPower = this._options.glowPower;
    result.time = (performance.now() - this._startTime) / 1000.0;
    
    return result;
  }

  equals(other?: any): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof FadeOutBeamMaterialProperty)) {
      return false;
    }
    return (
      Cesium.Color.equals(this._options.color, other._options.color) &&
      this._options.fadeFactor === other._options.fadeFactor &&
      this._options.glowPower === other._options.glowPower
    );
  }
}

@Component({
  selector: 'app-cesium-map',
  template: `
  <div class="file-uploader">
  <label for="xlsx-input">Carregar Pontos de Arquivo XLSX:</label>
  <input 
    type="file" 
    id="xlsx-input" 
    (change)="onFileSelected($event)" 
    accept=".xlsx, .xls"
  />
</div>
  <div id="cesiumContainer" style="width: 100%; height: 100vh;"></div>
  `
})
export class ExampleComponent implements OnInit {
  private viewer?: Cesium.Viewer;

  constructor() {
    (window as any).CESIUM_BASE_URL = '/assets/cesium/';
  }

  private xlsxReader = inject(XlsxReaderService);

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      // Nenhum arquivo selecionado; operação abortada
      return;
    }
    const file = input.files[0];

    try {
      // Chama o serviço para obter o vetor de coordenadas
      const coordinates = await this.xlsxReader.getCoordinatesFromFile(file);
      // Criar feixes a partir das coordenadas lidas
      this.createBeamsFromCoordinates(coordinates);

    } catch (error) {
      // Falha ao carregar coordenadas do arquivo
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

    // Cores tecnológicas modernas
    // this.createLightBeam(-46.63, -23.55, '#00ffff', 800000, 15000); // São Paulo - Ciano
    // this.createLightBeam(-74.07, 4.71, '#ff00ff', 800000, 15000);   // Bogotá - Magenta
    // this.createLightBeam(139.69, 35.68, '#ffff00', 800000, 15000);  // Tóquio - Amarelo
    // this.createLightBeam(2.35, 48.85, '#00ff00', 800000, 15000);    // Paris - Verde
    // this.createLightBeam(151.20, -33.86, '#ff4444', 800000, 15000); // Sydney - Vermelho

    // this.createNortheastBeamsOptimized();
    // this.createNortheastBeams();

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-20.0, -15.0, 15000000.0),
      duration: 3.5
    });
  }
  
    private beamMaterial?: Cesium.Material; // Para armazenar o material
  private removePreRenderListener?: () => void; // Para limpar o ouvinte
    private beamPrimitive?: Cesium.Primitive; // Para armazenar o primitivo

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

  // ✅ CRIAÇÃO DO MATERIAL CORRETO
  this.beamMaterial = new Cesium.Material({
    fabric: {
      uniforms: {
        color: beamColor,
        fadeFactor: 1.5,
        glowPower: 0.5,
        time: 0.0 // Nosso uniform de tempo manual
      },
      // ✅ SHADER COMPLETO E CORRIGIDO
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
            // ✅ Usa nosso 'uniform time' manual
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
      material: this.beamMaterial, // Passa o material que armazenamos
      translucent: true,
      faceForward: true
    }),
    asynchronous: false
  });

  this.viewer.scene.primitives.add(beamPrimitive);

  // ✅ ANIMAÇÃO DO TEMPO
  // Adiciona um ouvinte ao loop de renderização para atualizar nosso uniform de tempo.
  const startTime = performance.now();
  this.removePreRenderListener = this.viewer.scene.preRender.addEventListener(() => {
    if (this.beamMaterial) {
      this.beamMaterial.uniforms.time = (performance.now() - startTime) / 1000.0;
    }
  });
  }


  private createNortheastBeams(): void {
  if (!this.viewer) return;

  const numBeams = 10000;
  const beamColor = Cesium.Color.fromCssColorString('#00ff00');
  
  const instances = [];

  for (let i = 0; i < numBeams; i++) {
    const lon = -55 + Math.random() * 16;
    const lat = -27 + Math.random() * 24;
    const height = 1600000 + Math.random() * 400000;
    const radius = 8000 + Math.random() * 7000;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, height / 2);
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

  // ✅ CRIAÇÃO DO MATERIAL CORRETO
  this.beamMaterial = new Cesium.Material({
    fabric: {
      uniforms: {
        color: beamColor,
        fadeFactor: 1.5,
        glowPower: 0.5,
        time: 0.0 // Nosso uniform de tempo manual
      },
      // ✅ SHADER COMPLETO E CORRIGIDO
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
            // ✅ Usa nosso 'uniform time' manual
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
      material: this.beamMaterial, // Passa o material que armazenamos
      translucent: true,
      faceForward: true
    }),
    asynchronous: false
  });

  this.viewer.scene.primitives.add(beamPrimitive);

  // ✅ ANIMAÇÃO DO TEMPO
  // Adiciona um ouvinte ao loop de renderização para atualizar nosso uniform de tempo.
  const startTime = performance.now();
  this.removePreRenderListener = this.viewer.scene.preRender.addEventListener(() => {
    if (this.beamMaterial) {
      this.beamMaterial.uniforms.time = (performance.now() - startTime) / 1000.0;
    }
  });
}


  // private createNortheastBeams(): void {
  //   const numBeams = 200;
  //   const colors = ['#00ff00'];
    
  //   for (let i = 0; i < numBeams; i++) {
  //     const lon = -55 + Math.random() * 16;
  //     const lat = -27 + Math.random() * 24;
  //     const color = colors[Math.floor(Math.random() * colors.length)];
  //     const height = 1600000 + Math.random() * 400000;
  //     const radius = 8000 + Math.random() * 7000;
      
  //     this.createLightBeam(lon, lat, color, height, radius);
  //   }
  // }

  private createTipEffect(
  longitude: number,
  latitude: number,
  height: number,
  color: Cesium.Color
): void {
  if (!this.viewer) return;

  // Posição exata do topo do raio
  const tipPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

  // --- PARÂMETROS DO EFEITO ---
  const coreMaxSize = 8000.0;
  const coreMinSize = 5000.0;
  const coreMinSize2 = 6000.0;
  const ring1Size = 15000.0;
  const ring2Size = 10000.0;
  const haloSize = 45000.0;

  // 1. O NÚCLEO DE ENERGIA PULSANTE
  this.viewer.entities.add({
    position: tipPosition,
    ellipse: {
      // Anima o tamanho do núcleo para criar um efeito de "pulsação"
      semiMinorAxis: new Cesium.CallbackProperty(() => {
        const time = performance.now() / 500.0;
        return coreMinSize + (Math.sin(time) * 0.5 + 0.5) * (coreMaxSize - coreMinSize);
      }, false),
      semiMajorAxis: new Cesium.CallbackProperty(() => {
        const time = performance.now() / 500.0;
        return coreMinSize2 + (Math.sin(time) * 0.5 + 0.5) * (coreMaxSize - coreMinSize);
      }, false),
      material: new Cesium.ColorMaterialProperty(color.withAlpha(0.9)),
      height: height, // Garante que esteja na altura correta
    },
  });

  // 2. ANÉIS EM CONTRA-ROTAÇÃO (Efeito tecnológico clássico)
  // Anel Externo
  this.viewer.entities.add({
    position: tipPosition,
    ellipse: {
      semiMinorAxis: ring1Size,
      semiMajorAxis: ring1Size,
      fill: false, // Sem preenchimento
      outline: true,
      outlineColor: color,
      outlineWidth: 2,
      height: height,
      // Anima a rotação em um sentido
      rotation: new Cesium.CallbackProperty(() => performance.now() / 2000.0, false),
    },
  });

  // Anel Interno
  this.viewer.entities.add({
    position: tipPosition,
    ellipse: {
      semiMinorAxis: ring2Size,
      semiMajorAxis: ring2Size,
      fill: false,
      outline: true,
      outlineColor: color.withAlpha(0.7),
      outlineWidth: 1,
      height: height,
      // Anima a rotação no sentido OPOSTO
      rotation: new Cesium.CallbackProperty(() => -performance.now() / 1500.0, false),
    },
  });

  // 3. O HALO DE LUZ SUAVE
  const glowCanvas = this.createAdvancedGlowCanvas(color);
  this.viewer.entities.add({
    position: tipPosition,
    ellipse: {
      semiMinorAxis: haloSize,
      semiMajorAxis: haloSize,
      material: new Cesium.ImageMaterialProperty({
        image: glowCanvas,
        transparent: true,
        color: color.withAlpha(0.6),
      }),
      height: height,
    },
  });
}
    
  private createLightBeam(
  longitude: number,
  latitude: number,
  colorHex: string,
  height: number,
  radius: number = 15000
): void {
  if (!this.viewer) return;

  const color = Cesium.Color.fromCssColorString(colorHex);
  const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2);

  // Cilindro principal com material customizado
  this.viewer.entities.add({
    position,
    cylinder: {
      length: height,
      topRadius: radius * 0.1, // Deixa uma pequena base para o efeito do topo
      bottomRadius: radius,
      material: new FadeOutBeamMaterialProperty({
        color: color,
        // ✅ Aumenta o fade para uma transição suave para o novo efeito do topo
        fadeFactor: 2.5, 
        glowPower: 0.7,
      }),
      outline: false,
    },
  });

  // Efeito de base mais elaborado
  this.createBaseEffect(longitude, latitude, color, radius);

  // ✅ CHAMA A NOVA FUNÇÃO PARA ADICIONAR O EFEITO NA PONTA
  this.createTipEffect(longitude, latitude, height, color);
}

  private createBaseEffect(
    longitude: number, 
    latitude: number, 
    color: Cesium.Color, 
    radius: number
  ): void {
    if (!this.viewer) return;

    const glowCanvas = this.createAdvancedGlowCanvas(color);
    
    this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 50.0),
      ellipse: {
        semiMinorAxis: radius * 2.5,
        semiMajorAxis: radius * 2.5,
        material: new Cesium.ImageMaterialProperty({
          image: glowCanvas,
          transparent: true,
          color: color
        }),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      }
    });

    const ringCanvas = this.createRingCanvas(color);
    
    this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 20.0),
      ellipse: {
        semiMinorAxis: radius * 1.2,
        semiMajorAxis: radius * 1.2,
        material: new Cesium.ImageMaterialProperty({
          image: ringCanvas,
          transparent: true
        }),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: 100.0
      }
    });
  }

  private createAdvancedGlowCanvas(color: Cesium.Color, size = 256): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2;

    const r = Math.floor(color.red * 255);
    const g = Math.floor(color.green * 255);
    const b = Math.floor(color.blue * 255);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
    gradient.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, 0.8)`);
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.4)`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.1)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }

  private createRingCanvas(color: Cesium.Color, size = 128): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    const centerX = size / 2;
    const centerY = size / 2;

    const r = Math.floor(color.red * 255);
    const g = Math.floor(color.green * 255);
    const b = Math.floor(color.blue * 255);

    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.lineWidth = 4;
    ctx.stroke();

    const gradient = ctx.createRadialGradient(
      centerX, centerY, size / 4,
      centerX, centerY, size / 3
    );
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }
}