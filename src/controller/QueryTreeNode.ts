

export class QueryTreeNode {
	private key: string;
	private value: number|string|string[]|undefined;
	private children: QueryTreeNode[];
	private childrenStr: string[];

	constructor(key: string, value: number|string|string[]|undefined){
		this.key = key;
		this.value = value;
		this.children = [];
		this.childrenStr = [];

	}

	public getChildrenSize(){
		return this.children.length;
	}

	public getChildren(){
		return this.children;
	}

	public addChildren(child: QueryTreeNode){
		this.children.push(child);
	}

	public hasChildren(){
		if(this.children.length === 0){
			return false;
		}
		return true;
	}

	public setValue(val: number|string|string[]|undefined){
		this.value = val;
	}

	public getValue(){
		return this.value;
	}

	public setChildrenString(str: string){
		this.childrenStr.push(str);
	}

	public getChildrenString(){
		return this.childrenStr;
	}

	public getKey(){
		return this.key;
	}

	public toString(){
		let s = "key:[" + this.key + "] value: [" + this.value + "] [" + this.getChildrenSize() + "] children: [";
		for (const item of this.children) {
			s = s + item.getKey() + ", ";
		}
		if(this.childrenStr.length !== 0){
			s = s + "] children_name: [";
			for(const item of this.childrenStr){
				s = s + item + ",";
			}
		}
		s = s + "]";
		for (const item of this.children) {
			s = s + "\n" + item.toString();
		}


		return s;
	}

}
