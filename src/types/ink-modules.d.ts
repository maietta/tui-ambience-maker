declare module 'ink-select-input' {
  import { Component } from 'react';
  
  interface Item {
    label: string;
    value: string;
  }
  
  interface Props {
    items: Item[];
    onSelect: (item: Item) => void;
    initialIndex?: number;
    limit?: number;
    indicatorComponent?: Component;
    itemComponent?: Component;
  }
  
  export default class SelectInput extends Component<Props> {}
}

declare module 'ink-text-input' {
  import { Component } from 'react';
  
  interface Props {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    placeholder?: string;
    mask?: string;
    showCursor?: boolean;
    focus?: boolean;
    highlightPastedText?: boolean;
  }
  
  export default class TextInput extends Component<Props> {}
}
