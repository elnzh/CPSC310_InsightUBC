import {InsightError} from "./IInsightFacade";

export class Section {
	private uuid: string;
	private id: string;
	private title: string;
	private instructor: string;
	private dept: string;
	private year: number;
	private avg: number;
	private pass: number;
	private fail: number;
	private audit: number;


	constructor(uuid: string, id: string, title: string,instructor: string, dept: string, year: number,
		avg: number, pass: number, fail: number, audit: number){
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}

	public getValue(key: string){
		if(key === "uuid"){
			return this.uuid;
		}else if(key === "id"){
			return this.id;
		}else if(key === "title"){
			return this.title;
		}else if(key === "instructor"){
			return this.instructor;
		}else if(key === "dept"){
			return this.dept;
		}else if(key === "year"){
			return this.year;
		}else if(key === "avg"){
			return this.avg;
		}else if(key === "pass"){
			return this.pass;
		}else if(key === "fail"){
			return this.fail;
		}else if(key === "audit"){
			return this.audit;
		}else{
			throw new InsightError();
		}
	}

	public toJson(keylist: string|string[]|undefined, id: string){
		if (typeof keylist === "object"){
			let ret: {[key: string]: string|number;} = {};
			for(let i of keylist){
				ret[id + "_"  + i] = this.getValue(i);
			}
			return ret;

		}else if(typeof keylist === "string"){
			let temp = id + "_"  + keylist;
			return{
				[temp]:  this.getValue(keylist)
			};
		}else{
			let ret: {[key: string]: string|number;} = {};
			let pref = id + "_";
			ret[pref + "uuid"] = this.uuid;
			ret[pref + "id"] = this.id;
			ret[pref + "title"] = this.title;
			ret[pref + "instructor"] = this.instructor;
			ret[pref + "dept"] = this.dept;
			ret[pref + "year"] = this.year;
			ret[pref + "avg"] = this.avg;
			ret[pref + "pass"] = this.pass;
			ret[pref + "fail"] = this.fail;
			ret[pref + "audit"] = this.audit;
			return ret;

		}

	}

	public toString(){
		return "uuid:" + this.uuid + "\nid: " + this.id + "\ntitle:" + this.title + "\ninstructor: " + this.instructor +
			"\ndept:" + this.dept + "\nyear: " + this.year + "\navg:" + this.avg + "\npass: " + this.pass +
			"\nfail:" + this.fail + "\naudit:" + this.audit;
	}


	public static isMfield(str: string){
		if(str === "avg" || str === "pass" || str === "fail" || str === "audit" || str === "year"){
			return true;
		}else{
			return false;
		}
	}

	public static isSfield(str: string){
		if(str === "dept" || str === "id" || str === "instructor" || str === "title" || str === "uuid"){
			return true;
		}else{
			return false;
		}
	}


}
