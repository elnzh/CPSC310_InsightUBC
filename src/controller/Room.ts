import {InsightError} from "./IInsightFacade";

export class Room {
	private fullname: string;
	private shortname: string;
	private number: string;
	private name: string;
	private address: string;
	private type: string;
	private furniture: string;
	private href: string;
	private lat: number;
	private lon: number;
	private seats: number;

	constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		type: string,
		furniture: string,
		href: string,
		lat: number,
		lon: number,
		seats: number
	) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = name;
		this.address = address;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
	}

	public getValue(key: string) {
		if (key === "fullname") {
			return this.fullname;
		} else if (key === "shortname") {
			return this.shortname;
		} else if (key === "number") {
			return this.number;
		} else if (key === "name") {
			return this.name;
		} else if (key === "address") {
			return this.address;
		} else if (key === "type") {
			return this.type;
		} else if (key === "furniture") {
			return this.furniture;
		} else if (key === "href") {
			return this.href;
		} else if (key === "lat") {
			return this.lat;
		} else if (key === "lon") {
			return this.lon;
		} else if (key === "seats") {
			return this.seats;
		} else {
			throw new InsightError();
		}
	}

	public static isMfield(str: string){
		if(str === "lat" || str === "lon" || str === "seats"){
			return true;
		}else{
			return false;
		}
	}

	public static isSfield(str: string){
		if(str === "fullname" || str === "shortname" || str === "number" || str === "name" || str === "address" ||
			str === "type" || str === "furniture" || str === "href"){
			return true;
		}else{
			return false;
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
			ret[pref + "fullname"] = this.fullname;
			ret[pref + "shortname"] = this.shortname;
			ret[pref + "number"] = this.number;
			ret[pref + "name"] = this.name;
			ret[pref + "address"] = this.address;
			ret[pref + "type"] = this.type;
			ret[pref + "furniture"] = this.furniture;
			ret[pref + "href"] = this.href;
			ret[pref + "lat"] = this.lat;
			ret[pref + "lon"] = this.lon;
			ret[pref + "seats"] = this.seats;
			return ret;

		}

	}

}
