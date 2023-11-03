import {Section} from "./Section";
import {Room} from "./Room";
import {QueryTreeNode} from "./QueryTreeNode";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class AnswerQueryTrans {

	private sections: Section[];
	private rooms: Room[];
	private transformation: [{[key: string]: number|string;}] = [{}];
	private type: InsightDatasetKind;
	private hasTrans = false;
	constructor(type: InsightDatasetKind) {
		this.sections = [];
		this.rooms = [];
		this.type = type;
		this.transformation.pop();
	}


	public initializeDatasets(s: Section[], r: Room[], col: number[]){
		// console.log("trans:" + col.length);

		if(this.type === InsightDatasetKind.Sections){
			for(let i of col){
				this.sections.push(s[i]);
				// console.log(s[i]);
			}
		}else{
			for(let i of col){
				this.rooms.push(r[i]);
			}
		}
	}

	public hasTransformation(){
		return this.hasTrans;
	}

	public getTransformedList(){
		return this.transformation;
	}


	public handleTrans(group: string[], apply: QueryTreeNode){
		this.hasTrans = true;
		if(this.type === InsightDatasetKind.Sections){
			this.handleTransSection(group, apply);
		}else{
			this.handleTransRoom(group, apply);
		}
		// console.log("check trans:" + this.transformation.length);
		// for(let i in this.transformation){
		// 	for (const key in this.transformation[i]) {
		// 		console.log(`${key}:::: ${this.transformation[i][key]}`);
		// 	}
		// }
		return this.transformation;
	}

	private handleTransSection(group: string[], apply: QueryTreeNode){
		let map = new Map<string, Section[]>();
		let applycol = [];
		let arr = this.sections;
		for(let i in arr){
			let keyVal = "";
			for(let g in group){
				let temp = arr[i].getValue(group[g]);
				keyVal = keyVal.concat(String(temp),"_");
			}
			let val = map.get(keyVal);
			if(val === undefined){
				let temp = [];
				temp.push(arr[i]);
				map.set(keyVal,temp);
			}else{
				val.push(arr[i]);
			}
		}
		let applyChildren = apply.getChildren();
		for(let a in applyChildren){
			applycol.push(applyChildren[a].getKey()); // minAVG
			let token = applyChildren[a].getChildrenString();// MIN,MAX,AVG...
			let field = applyChildren[a].getValue(); // avg
			for(let key of map.keys()){
				let val: number;
				let temp = map.get(key);
				if(temp === undefined) {
					throw new InsightError("undefiend map value");
				}
				if(token[0] === "MAX"){
					val = this.calculateMAX(temp,String(field));
				}else if(token[0] === "MIN"){
					val = this.calculateMIN(temp,String(field));
				}else if(token[0] === "AVG"){
					val = this.calculateAVG(temp,String(field));
				}else if(token[0] === "SUM"){
					val = this.calculateSUM(temp,String(field));
				}else{
					val = this.findCOUNT(temp,String(field));
				}
				// initialize the obj
				let obj: {[key: string]: number|string;} = {};
				for(let g in group){
					obj[group[g]] = temp[0].getValue(group[g]);
				}
				obj[applycol[a]] = val;
				this.transformation.push(obj);
			}
		}
	}

	private handleTransRoom(group: string[], apply: QueryTreeNode){
		let map = new Map<string, Room[]>();
		let applycol = [];
		let arr = this.rooms;
		for(let i in arr){
			let keyVal = "";
			for(let g in group){
				keyVal = keyVal.concat(String(arr[i].getValue(group[g])),"_");
			}
			let val = map.get(keyVal);
			if(val === undefined){
				let temp = [];
				temp.push(arr[i]);
				map.set(keyVal,temp);
			}else{
				val.push(arr[i]);
			}
		}
		let applyChildren = apply.getChildren();
		for(let a in applyChildren){
			applycol.push(applyChildren[a].getKey()); // minAVG
			let token = applyChildren[a].getChildrenString();// MIN,MAX,AVG...
			let field = applyChildren[a].getValue(); // avg
			for(let key of map.keys()){
				let val: number;
				let temp = map.get(key);
				if(temp === undefined) {
					throw new InsightError("undefined map value");
				}
				if(token[0] === "MAX"){
					val = this.calculateMAX(temp,String(field));
				}else if(token[0] === "MIN"){
					val = this.calculateMIN(temp,String(field));
				}else if(token[0] === "AVG"){
					val = this.calculateAVG(temp,String(field));
				}else if(token[0] === "SUM"){
					val = this.calculateSUM(temp,String(field));
				}else{
					val = this.findCOUNT(temp,String(field));
				}
                // initialize the obj
				let obj: {[key: string]: number|string;} = {};
				for(let g in group){
					obj[group[g]] = temp[0].getValue(group[g]);
				}
				obj[applycol[a]] = val;
				// console.log(obj);
				this.transformation.push(obj);
			}
		}
	}


	public calculateAVG(datasets: Section[]|Room[], key: string){
		let size = datasets.length;
		let total = 0.0;
		for(let i in datasets){
			let val = datasets[i].getValue(key);
			if(typeof val === "string"){
				throw new InsightError("AVG wrong key");
			}else{
				total = total + val;
			}
		}
		return Math.round( (total / size) * 1e2 ) / 1e2;
	}

	public calculateMIN(datasets: Section[]|Room[], key: string){
		let val = datasets[0].getValue(key);
		if(typeof val === "string"){
			throw new InsightError("MIN wrong key");
		}
		let min = val;
		for(let i in datasets){
			val = datasets[i].getValue(key);
			if(typeof val === "string"){
				throw new InsightError("MIN wrong key");
			}else{
				if(val < min){
					min = val;
				}
			}
		}
		return min;
	}

	public calculateMAX(datasets: Section[]|Room[], key: string){
		let val = datasets[0].getValue(key);
		if(typeof val === "string"){
			throw new InsightError("MAX wrong key");
		}
		let max = val;
		for(let i in datasets){
			val = datasets[i].getValue(key);
			if(typeof val === "string"){
				throw new InsightError("MAX wrong key");
			}else{
				if(val > max){
					max = val;
				}
			}
		}
		return max;
	}

	public calculateSUM(datasets: Section[]|Room[], key: string){
		let total = 0.0;
		for(let i in datasets){
			let val = datasets[i].getValue(key);
			if(typeof val === "string"){
				throw new InsightError("SUM wrong key");
			}else{
				total = total + val;
			}
		}
		return total;
	}

	public findCOUNT(datasets: Section[]|Room[], key: string){
		let set = new Set();
		for(let i in datasets){
			let val = datasets[i].getValue(key);
			set.add(val);
		}
		return set.size;
	}

	public getTransSize(){
		return this.transformation.length;
	}

}
