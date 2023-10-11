import {InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import {Section} from "./Section";

export default class DataSetHelper {
	public static course: string[] = ["id","Course","Title","Professor","Subject","Year","Avg","Pass","Fail","Audit"];
	public static addSectionDataset(content: string): Promise<Section[]> {
		return JSZip.loadAsync(content, {base64:true})
			.then((contentZip) => {
				if (contentZip.folder(/courses/).length === 0) {
					throw new InsightError("No valid section files in courses.");
				}
				const filePromise: Array<Promise<string>> = [];
				contentZip.forEach((path,file)=> {
					if(path.startsWith("courses/")) {
						filePromise.push(file.async("text"));
					}
				});
				return Promise.all(filePromise);
			})
			.then((filePromise) => {
				return this.parseSectionsFiles(filePromise);
			}).catch((error) => {
				return Promise.reject("Invalid files.");
			});
	}

	private static parseSectionsFiles(filePromise: string[]) {
		let sectionList: Section[] = [];
		for (let f of filePromise) {
			if (f === "") {
				continue;
			}
			let jsonF = JSON.parse(f);
			let results = jsonF["result"];
			for (let r of results) {
				const containAll: boolean = "id" in r && "Course" in r && "Title" in r
					&& "Professor" in r && "Subject" in r && "Avg" in r && "Pass" in r && "Fail" in r
					&& "Audit" in r;
				if (containAll) {
					const year = r["Section"] === "overall" ?  1900 : Number(r["Year"]);
					let s = new Section(r["id"].toString(), r["Course"], r["Title"], r["Professor"], r["Subject"],
						year, r["Avg"], r["Pass"], r["Fail"], r["Audit"]);
					sectionList.push(s);
				}
			}
		}
		if (sectionList.length === 0) {
			throw new InsightError("There is no courses in this folder!");
		}
		return sectionList;
	}
};
