import {InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import {Section} from "./Section";
import {Room} from "./Room";
import * as parse5 from "parse5";
import {Document, Element, TextNode} from "parse5/dist/tree-adapters/default";
import * as http from "http";
import GeoLocationHelper from "./GeoResponse";
export default class DataSetHelper {
	public static addSectionDataset(content: string): Promise<Section[]> {
		return JSZip.loadAsync(content, {base64: true})
			.then((contentZip) => {
				if (contentZip.folder(/courses/).length === 0) {
					throw new InsightError("No valid section files in courses.");
				}
				const filePromise: Array<Promise<string>> = [];
				contentZip.forEach((path, file) => {
					if (path.startsWith("courses/")) {
						filePromise.push(file.async("text"));
					}
				});
				return Promise.all(filePromise);
			})
			.then((filePromise) => {
				return Promise.resolve(this.parseSectionsFiles(filePromise));
			})
			.catch((error) => {
				return Promise.reject("Invalid files.");
			});
	}

	public static addRoomDataset(content: string): Promise<Room[]> {
		const buildings: any[] = [];
		const rooms: any[] = [];
		let contentZip: JSZip;
		return JSZip.loadAsync(content, {base64: true})
			.then((zip) => {
				contentZip = zip;
				return contentZip.file("index.htm")?.async("text");
			})
			.then((indexContent) => {
				if (indexContent === undefined) {
					throw new InsightError("No index.htm file in rooms.");
				}
				const geoPromise = this.getBuildingFromIndexContent(indexContent, buildings);
				return Promise.all(geoPromise);
			})
			.then((buildingsWithGeoLocation) => {
				const buildingPromise: Array<Promise<string>> = [];
				buildings.forEach((building) => {
					const file = contentZip.file(building["href"].substring(2,building["href".length]));
					if (file !== null) {
						buildingPromise.push(file.async("text"));
					}
				});
				return Promise.all(buildingPromise);
			})
			.then((roomPromise) => {
				for (let roomString of roomPromise) {
					const roomNode = parse5.parse(roomString);
					rooms.push(...DataSetHelper.findTheRoomTables(roomNode));
				}
				DataSetHelper.mapRoomstoBuilding(rooms,buildings);
				return rooms;
			})
			.catch((error) => {
				return Promise.reject("Invalid files.");
			});
	}

	private static getBuildingFromIndexContent(indexContent: string, buildings: any[]) {
		let indexhtm = parse5.parse(indexContent);
		const indexhtmNodes = indexhtm.childNodes;
		while (indexhtmNodes.length > 0) {
			const node = indexhtmNodes.pop();
			const isTable = node !== undefined && node.nodeName === "table";
			const isClass = node !== undefined && "attrs" in node && node.attrs.length > 0
				&& DataSetHelper.isCorrectElement(node.attrs, "class", "views-table cols-5 table");

			if (isTable && isClass) {
				buildings.push(...DataSetHelper.retrieveBuildings(node));
			}
			if (node !== undefined && "childNodes" in node) {
				indexhtmNodes.push(...node.childNodes);
			}
		}
		const geoPromise: Array<Promise<any>> = [];
		buildings.forEach((building) => {
			geoPromise.push(GeoLocationHelper.retrieveGeoLocation(building));
		});
		return geoPromise;
	}

	private static findTheRoomTables(documemt: Document): any {
		const indexhtmNodes = [...documemt.childNodes];
		let buildingName: string = "";
		let rooms: any[] = [];
		while (indexhtmNodes.length > 0) {
			const node = indexhtmNodes.pop();
			const isInfo = node !== undefined && "attrs" in node && node.attrs.length > 0
				&& DataSetHelper.isCorrectElement(node.attrs,"id","building-info");
			if (isInfo) {
				if ("childNodes" in node && "childNodes" in node.childNodes[1]
					&& "childNodes" in node.childNodes[1].childNodes[0]
					&& "value" in node.childNodes[1].childNodes[0].childNodes[0]) {
					buildingName = node.childNodes[1].childNodes[0].childNodes[0].value;
				}
			}
			if (node !== undefined && "childNodes" in node) {
				indexhtmNodes.push(...node.childNodes);
			}
		}
		indexhtmNodes.push(...documemt.childNodes);
		while (indexhtmNodes.length > 0) {
			// < table class="views-table cols-5 table">
			const node = indexhtmNodes.pop();
			const isTable = node !== undefined && node.nodeName === "table";
			const isClass = node !== undefined && "attrs" in node && node.attrs.length > 0
				&& DataSetHelper.isCorrectElement(node.attrs,"class","views-table cols-5 table");
			if (isTable && isClass) {
				rooms.push(...DataSetHelper.retriveRooms(node,buildingName));
			}
			if (node !== undefined && "childNodes" in node) {
				indexhtmNodes.push(...node.childNodes);
			}
		}
		return rooms;
	}

	private static retriveRooms(node: Element, buildingName: string): any[] {
		const buildings: any[] = [];
		let tbody: any;
		for(const childNode of node.childNodes) {
			if (childNode.nodeName === "tbody") {
				tbody = childNode;
			}
		}
		for (const childNode of tbody.childNodes) {
			if (childNode.nodeName === "tr") {
				buildings.push(DataSetHelper.generateRoom(childNode,buildingName));
			}
		}
		return buildings;
	}

	private static generateRoom(node: any, buildingName: string): Room {
		const room: any = {fullname: buildingName};
		for (const childNode of node.childNodes) {
			if (childNode.nodeName === "td") {
				const isClass = "attrs" in childNode && childNode.attrs.length > 0;
				if (isClass
					&& DataSetHelper.isCorrectElement(childNode.attrs,
						"class","views-field views-field-field-room-number")) {
					room["number"] = childNode.childNodes[1].childNodes[0].value.trim();
				} else if (isClass
					&& DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-field-room-capacity")) {
					room["seats"] = Number(childNode.childNodes[0].value.trim());
				} else if (isClass
					&& DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-field-room-furniture")) {
					room["furniture"] = childNode.childNodes[0].value.trim();
				} else if (isClass
					&& DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-field-room-type")) {
					room["type"] = childNode.childNodes[0].value.trim();
				}
			}
		}
		return new Room(buildingName, room["number"], room["seats"], room["furniture"], room["type"]);
		// return room;
	}

	private static mapRoomstoBuilding(rooms: any[], buildings: any[]): void {
		for (const building of buildings) {
			const roomsInBuilding = rooms.filter((room) => {
				return room["fullname"] === building["fullname"];
			});
			for (const room of roomsInBuilding) {
				if(room instanceof Room){
					let name = room.getValue("shortname") + "_" + room.getValue("number");
					room.setBuildingValue(building["shortname"], name, building["address"], building["href"],
						building["lat"], building["lon"]);
				}else{
					throw new InsightError("dataset helper 185");
				}
				// room["shortname"] = building["shortname"];
				// room["address"] = building["address"];
				// room["href"] = building["href"];
				// room["name"] = room["shortname"] + "_" + room["number"];
				// room["lat"] = building["lat"];
				// room["lon"] = building["lon"];
			}
		}
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
				const containAll: boolean =
					"id" in r &&
					"Course" in r &&
					"Title" in r &&
					"Professor" in r &&
					"Subject" in r &&
					"Avg" in r &&
					"Pass" in r &&
					"Fail" in r &&
					"Audit" in r;
				if (containAll) {
					const year = r["Section"] === "overall" ? 1900 : Number(r["Year"]);
					let s = new Section(
						r["id"].toString(),
						r["Course"],
						r["Title"],
						r["Professor"],
						r["Subject"],
						year,
						r["Avg"],
						r["Pass"],
						r["Fail"],
						r["Audit"]
					);
					sectionList.push(s);
				}
			}
		}
		if (sectionList.length === 0) {
			throw new InsightError("There is no courses in this folder!");
		}
		return sectionList;
	}

	private static isCorrectElement(attrs: any[],attributeName: string, attributeValue: string): boolean {
		for (const attr of attrs) {
			if ("name" in attr && attr.name === attributeName) {
				if ("value" in attr && attr.value === attributeValue) {
					return true;
				}
			}
		}
		return false;
	}

	private static retrieveBuildings(node: any): any[] {
		const buildings: any[] = [];
		let tbody: any;
		for(const childNode of node.childNodes) {
			if (childNode.nodeName === "tbody") {
				tbody = childNode;
			}
		}
		for (const childNode of tbody.childNodes) {
			if (childNode.nodeName === "tr") {
				buildings.push(DataSetHelper.generateBuilding(childNode));
			}
		}
		return buildings;
	}

	private static generateBuilding(node: any): any {
		const building: any = {};
		for (const childNode of node.childNodes) {
			if (childNode.nodeName === "td") {
				const isClass = "attrs" in childNode && childNode.attrs.length > 0;
				if (isClass
					&& DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-field-building-code")) {
					building["shortname"] = childNode.childNodes[0].value.trim();
				} else if (isClass && DataSetHelper.isCorrectElement(childNode.attrs,"class",
					"views-field views-field-title")) {
					building["fullname"] = childNode.childNodes[1].childNodes[0].value.trim();
				} else if (isClass &&
					DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-field-building-address")) {
					building["address"] = childNode.childNodes[0].value.trim();
				} else if (isClass &&
					DataSetHelper.isCorrectElement(childNode.attrs,"class",
						"views-field views-field-nothing")) {
					building["href"] = childNode.childNodes[1].attrs[0].value.trim();
				}
			}
		}
		return building;
	}
}
