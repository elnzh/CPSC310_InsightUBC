

export class QueryTreeNode {
	private key: string;
	private value: string|string[]|undefined;
	private children: QueryTreeNode[];

	constructor(key: string, value: string|string[]|undefined){
		this.key = key;
		this.value = value;
		this.children = [];

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
	public getValue(){
		return this.value;
	}

	public getKey(){
		return this.key;
	}

	public toString(){
		let s = "key:[" + this.key + "] value: [" + this.value + "] [" + this.getChildrenSize() + "] children: [";
		for (const item of this.children) {
			s = s + item.getKey() + ", ";
		}
		s = s + "]";
		for (const item of this.children) {
			s = s + "\n" + item.toString();
		}


		return s;
	}

}
