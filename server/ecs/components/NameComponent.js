import Component from '../Component.js';

export default class NameComponent extends Component {
  constructor(name = '', title = '') {
    super();
    this.name = name;
    this.title = title;
  }
}
