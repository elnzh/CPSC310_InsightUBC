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
		}else{
			return this.audit;
		}
	}


	public toJson(keylist: string|string[]|undefined){
		if (typeof keylist === "object"){
			let ret: {[key: string]: string|number;} = {};
			for(let i of keylist){
				ret[i] = this.getValue(i);
			}
			return ret;

		}else if(typeof keylist === "string"){
			return{
				keylist: this.getValue(keylist)
			};
		}else{
			return {
				uuid: this.uuid,
				id: this.id,
				title: this.title,
				instructor: this.instructor,
				dept: this.dept,
				year: this.year,
				avg: this.avg,
				pass: this.pass,
				fail: this.fail,
				audit: this.audit
			};
		}

	}

}
