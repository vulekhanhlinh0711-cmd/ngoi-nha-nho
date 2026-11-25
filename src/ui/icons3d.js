// P21: biểu tượng 3D bóng bẩy (Fluent 3D Emoji của Microsoft, giấy phép MIT — xem icons/3d/LICENSE-fluentui-emoji.txt).
import { h } from './dom.js';
export const ic3d = (name, cls = '') => h('img', { class: `ic3d ${cls}`, src: `icons/3d/${name}.png`, alt: '', width: 128, height: 128, loading: 'lazy', decoding: 'async' });
