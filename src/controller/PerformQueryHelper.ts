import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {Section} from "./Section";
import {Room} from "./Room";

export default class PerformQueryHelper{

	public static checkIsNonEmptyArray(arr: any){
		if(arr === undefined){
			throw new InsightError("expect array, got undefined");
		}else {
			if (!Array.isArray(arr) || Array.from(arr).length === 0) {
				throw new InsightError("expect a non-empty array");
			}
		}
	}

	public static checkKeyType(key: string){
		if(Section.isMfield(key) || Section.isSfield(key)){
			return InsightDatasetKind.Sections;
		}else if(Room.isMfield(key) || Room.isSfield(key)){
			return InsightDatasetKind.Rooms;
		}else{
			return undefined;
		}
	}

	public static isSfield(str: string){
		if(Section.isSfield(str) || Room.isSfield(str)){
			return true;
		}else{
			return false;
		}
	}

	public static isCustomField(str: string){
		if(Section.isSfield(str) || Room.isSfield(str) || Section.isMfield(str) || Room.isMfield(str)){
			return false;
		}
		return true;
	}


	public static findDuplicate(arr1: number[], arr2: number[]){
		return arr1.filter((element) => arr2.includes(element));
	}

	public static mergeNoDuplicate(arr1: number[], arr2: number[]){
		let arr = [...arr1, ...arr2];
		return [...new Set(arr)];
	}

	public static excludeArr(arr1: number[], ar2: number[]){
		let arr2 = new Set(ar2);
		return arr1.filter( (x) => !arr2.has(x) );
	}


}

