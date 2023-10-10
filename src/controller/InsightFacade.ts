import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";

import {QueryTreeNode} from "./QueryTreeNode";
import {Section} from "./Section";
import QueryBuilder from "./QueryBuilder";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */


export default class InsightFacade implements IInsightFacade {

	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}


	private id_str: string = "";
	private idAndDatasets: {[key: string]: Section[]} = {};
	private sections: Section[] = [];


	public performQuery(query: unknown): Promise<InsightResult[]> {
		let querybuilder = new QueryBuilder();
		let root = querybuilder.parseQuery(`{"WHERE":
		{"OR":
			[{"AND":
				[{"GT":{"sections_avg":50}},
		 		{"IS":{"sections_dept":"p*"}}
			]},
		{"EQ":{"sections_pass":10}}]},
		"OPTIONS":{"COLUMNS":["sections_dept",
		"sections_id","sections_avg"],"ORDER":"sections_id"}}`);

		// let parsed = JSON.parse(String(`{"WHERE":{"OR":[{"AND":[{"GT":{"sections_avg":90}},
		// {"IS":{"sections_dept":"adhe"}}]},{"EQ":{"sections_avg":95}}]},"OPTIONS":{"COLUMNS":["sections_dept",
		// "sections_id","sections_avg"],"ORDER":"sections_avg"}}`));
		// console.log(parsed.WHERE.OR.length);


		let sec =  new Section("20405", "316", "phil after 1800","schouls, peter",
			"phil", 2009, 71.98, 57, 2, 0);
		this.idAndDatasets[this.id_str] = [];
		this.idAndDatasets[this.id_str].push(sec);
		this.idAndDatasets[this.id_str].push( new Section("20225", "326", "phil after 1800","schouls, peter",
			"phil", 2009, 71.98, 57, 2, 0));
		this.idAndDatasets[this.id_str].push( new Section("20225", "336", "phil after 1800","schouls, peter",
			"phil", 2009, 71, 57, 2, 0));
		this.sections = this.idAndDatasets[this.id_str];
		// console.log(this.idAndDatasets[this.id].length);
		let result = this.answerQuery(root);
		console.log(result);
		return Promise.resolve(result);
	}
	public answerQueryWhere(node: QueryTreeNode){
		console.log(97);
		if(node.hasChildren()){
			console.log(99);
			// haven't reached the leaves
			let children = node.getChildren();
			let sectionIndex: number[] = [];
			if(node.getKey() === "AND"){
				for(let i = 0; i < node.getChildrenSize(); i++) {
					// find the same sections among all the children
					let temp = this.answerQueryWhere(children[i]);
					console.log(node.getKey());
					if(sectionIndex.length === 0){
						sectionIndex.push(...temp);
					}else{
						// find the intersection
						sectionIndex = this.findDuplicate(sectionIndex,temp);
					}
				}
			}else if(node.getKey() === "OR"){
				for(let i = 0; i < node.getChildrenSize(); i++) {
					// add all sections among all children
					let temp = this.answerQueryWhere(children[i]);
					console.log(117);
					if(sectionIndex.length === 0){
						sectionIndex.push(...temp);
					}else{
						// find the intersection
						sectionIndex = this.mergeNoDuplicate(sectionIndex,temp);
					}
				}
			}else if(node.getKey() === "NOT"){
				console.log(node.getKey());
				if( node.getChildrenSize() === 1){
					let arr1 = [...Array(this.sections.length).keys()];  // array = 0,1....length-1
					let temp = this.answerQueryWhere(children[0]);
					sectionIndex = this.excludeArr(arr1,temp);

				}else{
					throw new InsightError("127");
				}
			}
			return sectionIndex;
		} else {
			// reach either a mkey or skey
			let sectionIndex = this.answerQueryWhereBaseCase(node);
			return sectionIndex;
		}
	}


	public answerQuery(node: QueryTreeNode){
		let nodes =  node.getChildren();
		let colIndex: number[] = [];
		let res: InsightResult[] = [];
		for(const n of nodes){
			if(n.getKey() === "WHERE"){
				colIndex = this.answerQueryWhere(n.getChildren()[0]);
				console.log("colIndex: " + colIndex.length);
				if(colIndex.length > 5000){
					throw new ResultTooLargeError("The result is too big. Only queries with a maximum of 5000 " +
                        "results are supported.");
				}
			}else if(n.getKey() === "OPTIONS"){
				let column = n.getChildren()[0].getValue();
				let order = n.getChildren()[1].getValue();
				if(typeof order === "object"){
					order = order[0];
				}

				if(typeof column === "string" || typeof column === "object"){
					for(let i of colIndex){
						let s = this.sections[i];
						res.push(s.toJson(column));
					}
					res.sort((a: {[key: string]: any}, b: {[key: string]: any}) => a[String(order)
					] > b[String(order)] ? 1 : -1);

				}else{
					throw new InsightError("line 199");
				}


			}else{
				console.log("error");
			}
		}
        //
		return res;
	}
	private answerQueryWhereBaseCase(node: QueryTreeNode) {
		let sectionIndex: number[] = [];
		if (node.getKey() === "IS") {
			let start: boolean = false;
			let end: boolean = false;
			let value: string = String(node.getValue());
			if(value.startsWith("*")){
				value = value.substring(1);
				start = true;
			}else if(value.endsWith("*")){
				value = value.substring(0, value.length - 1);
				end = true;
			}
			for (let i = 0; i < this.sections.length; i++) {
				this.handleQueryIs(start, end, i, node, value, sectionIndex);
			}
		} else {
			let value = node.getKey();
			for (let i = 0; i < this.sections.length; i++) {
				if (node.getKey() === "EQ") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) === node.getValue()) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}else if (node.getKey() === "GT") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) > Number(node.getValue())) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}else if (node.getKey() === "LT") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) < Number(node.getValue())) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}
			}
		}
		return sectionIndex;
	}


	private handleQueryIs(start: boolean, end: boolean, i: number, node: QueryTreeNode,
						  value: string, sectionIndex: number[]) {
		if (start && end) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).includes(value)) {
				sectionIndex.push(i);
			}
		} else if (start) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).endsWith(value)) {
				sectionIndex.push(i);
			}
		} else if (end) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).startsWith(value)) {
				sectionIndex.push(i);
			}
		} else {
			if (this.sections[i].getValue(node.getChildrenString()[0]) === value) {
				// if a section matches, add its index
				sectionIndex.push(i);
			}
		}
	}

	public findDuplicate(arr1: number[], arr2: number[]){
		return arr1.filter((element) => arr2.includes(element));
	}

	public mergeNoDuplicate(arr1: number[], arr2: number[]){
		let arr = [...arr1, ...arr2];
		return [...new Set(arr)];
	}

	public excludeArr(arr1: number[], ar2: number[]){
		let arr2 = new Set(ar2);
		return arr1.filter( (x) => !arr2.has(x) );
	}
}

