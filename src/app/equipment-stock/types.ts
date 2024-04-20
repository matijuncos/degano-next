export enum inputType {
  parent = 'parent',
  child = 'child'
}

export type InputTreeParent = {
  value: string;
  type: inputType;
  children?: InputTreeParent[];
  price?: string;
  _id: any;
  parentValue?: string;
  quantity?: string;
};
