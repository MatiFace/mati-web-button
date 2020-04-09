import { LitElement, html, css } from "lit-element";
import "./mati-button-element";
import "./mati-frame";

const EventBase = 'mati';

const Events = {
  loaded: 'loaded',
  error: 'errorSdk',
  exitedSdk: 'exitedSdk',
  userFinishedSdk: 'userFinishedSdk',
};

function htmlDecode(string) {
  const e = document.createElement("textarea");
  e.innerHTML = string;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

export default class MatiButton extends LitElement {
  static get properties() {
    return {
      clientId: { type: String },
      apiHost: { type: String },
      signupHost: { type: String },
      disabled: { type: Boolean },
      loading: { type: Boolean },
      color: { type: String },
      language: { type: String },
      metadata: { type: String },
      flowId: { type: String }
    };
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }
    `;
  }

  constructor() {
    super();
    this.disabled = true;
    this.loading = true;
    this.apiHost = "https://api.getmati.com";
    this.signupHost = "https://signup.getmati.com";
    [this.language] = navigator.language.split("-");
    this.metadata = null;

    this.addEventListener("click", this.openIframe);
    window.addEventListener("message", this.handleFrameMessages.bind(this));
  }

  get metadata() {
    return this._metadata ? htmlDecode(this._metadata) : this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  handleFrameMessages({ origin, data }) {
    if (origin !== this.signupHost) {
      return;
    }

    try {
      const { action, payload } = JSON.parse(data);
      const [, actionName] = action.split("::");

      switch (actionName) {
        case Events.loaded:
          this.disabled = false;
          this.loading = false;
          break;
        case Events.exitedSdk:
        case Events.userFinishedSdk:
          this.removeFrame();
          break;
      }
      this.emitEvent(actionName, payload);
    } catch (e) {
      console.error("Mati: unable to read info from mati popup", e);
      this.emitEvent(Events.error, e);
    }
  }

  emitEvent(name, payload) {
    const event = new CustomEvent(`${EventBase}:${name}`, {
      detail: {
        ...payload,
      }
    });
    this.dispatchEvent(event);
  }

  removeFrame() {
    const oldIframe = document.querySelector("mati-frame");
    if (oldIframe) {
      oldIframe.remove();
    }
  }

  openIframe() {
    this.disabled = true;
    this.loading = true;
    this.removeFrame();
    const frame = document.createElement("mati-frame");
    for (const key of ["signupHost", "clientId", "metadata", "flowId"]) {
      this[key] && frame.setAttribute(key, this[key]);
    }
    window.document.body.appendChild(frame);

    // Force re-enable button and allow user to retry the click.
    setTimeout(() => {
      this.disabled = false;
      this.loading = false;
    }, 2000);
  }

  async firstUpdated() {
    const api = `${this.apiHost}/api/v1/merchants/me`;
    const headers = {
      authorization: `Bearer ${this.clientId}`
    };
    try {
      const response = await fetch(api, { headers });
      const {
        configurations: {
          style: { color }
        }
      } = await response.json();
      this.color = color;
      this.disabled = false;
      this.loading = false;
    } catch (e) {
      console.error("Mati: unable to read data for the client");
    }
  }

  render() {
    return html`
      <mati-button-element
        ?disabled="${this.disabled}"
        ?loading="${this.loading}"
        color="${this.color}"
        language="${this.language}"
      ></mati-button-element>
    `;
  }
}

customElements.define("mati-button", MatiButton);
