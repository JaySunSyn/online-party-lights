import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

import { initializeApp } from "firebase/app";
import { Analytics, getAnalytics, logEvent } from "firebase/analytics";

// @ts-ignore-next-line
import { RealTimeBPMAnalyzer } from 'realtime-bpm-analyzer/src/realtime-bpm-analyzer.js';

interface BPM {
  tempo: number;
}

const bufferSize = 4096;

export class AppShell extends LitElement {
  @property({ type: Object }) _beatInterval:
    | ReturnType<typeof setInterval>
    | undefined;

  @property({ type: Object }) _audioContext: AudioContext | undefined;

  @property({ type: Boolean }) _started: boolean;

  @property({ type: Boolean }) _initialized: boolean;
  
  @property({ type: Object }) _analytics: Analytics;

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
    .main {
      height: 100%;
      width: 100%;
      background-color: var(--beat-background-color, #000);
    }

    .main[initializing] {
      height: 98%;
    }

    button {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      height: 50px;
      width: 100px;
      border-radius: 5px;
      border: 0;
    }
  `;

  constructor() {
    super();
    this._started = false;
    this._initialized = false;


    const firebaseConfig = {
      apiKey: "AIzaSyB4nD_GZF3ISXIgLX3osmC-3cP5H594Yxo",
      authDomain: "music-party-lights-online.firebaseapp.com",
      projectId: "music-party-lights-online",
      storageBucket: "music-party-lights-online.appspot.com",
      messagingSenderId: "326031934511",
      appId: "1:326031934511:web:292376d66b9aa7b23bf2da",
      measurementId: "G-8HXNLMBB3F"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    this._analytics = getAnalytics(app);
  }

  _onStream(stream: MediaStream) {
    if (this._audioContext == null) {
      return;
    }
    const input = this._audioContext.createMediaStreamSource(stream);
    const scriptProcessorNode = this._audioContext.createScriptProcessor(
      bufferSize,
      1,
      1
    );

    input.connect(scriptProcessorNode);
    scriptProcessorNode.connect(this._audioContext.destination);

    const onAudioProcess = new RealTimeBPMAnalyzer({
      debug: true,
      scriptNode: {
        bufferSize,
        numberOfInputChannels: 1,
        numberOfOutputChannels: 1,
      },
      computeBPMDelay: 3000,
      stabilizationTime: 10000,
      continuousAnalysis: true,
      pushTime: 1000,
      pushCallback: (err: any, bpmList: BPM[]) => {
        if (bpmList == null || bpmList.length === 0) {
          // eslint-disable-next-line no-console
          console.info('Listening...');
          return;
        }
        this._initialized = true;
        const bpm = bpmList[0].tempo;
        this._bpmChanged(bpm);
      },
      onBpmStabilized: (threshold: number) => {
        onAudioProcess.clearValidPeaks(threshold);
      },
    });

    scriptProcessorNode.onaudioprocess = e => {
      onAudioProcess.analyze(e);
    };
  }

  async _initAudio() {
    const context = new window.AudioContext();
    this._audioContext = context;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const input = context.createMediaStreamSource(stream);
    const scriptProcessorNode = context.createScriptProcessor(bufferSize, 1, 1);

    input.connect(scriptProcessorNode);
    scriptProcessorNode.connect(context.destination);

    this._onStream(stream);
  }

  _changeColor(color: string) {
    this.style.setProperty('--beat-background-color', color);
  }

  _onBeat() {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    this._changeColor(`#${randomColor}`);
  }

  _bpmChanged(bpm: number) {
    // eslint-disable-next-line no-console
    console.info(`BPM: ${bpm}`);
    if (this._beatInterval) {
      clearInterval(this._beatInterval);
    }

    this._beatInterval = setInterval(() => {
      this._onBeat();
    }, (60 / bpm) * 1000);
  }

  _start() {
    this._initAudio();
    this._started = true;
    this._bpmChanged(120);
    logEvent(this._analytics, 'start_clicked');
  }

  render() {
    if (!this._started) {
      return html`<button @click=${this._start}>Start</button>`;
    }
    return html`<div class="main" ?initializing=${!this._initialized}></div> `;
  }
}
