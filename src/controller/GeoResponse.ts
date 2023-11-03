import http from "http";

interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export default class GeoLocationHelper{
	public static retrieveGeoLocation(building: any): Promise<GeoResponse> { // Reference from https://nodejs.org/api/http.html#httpgeturl-options-callback
		return new Promise((resolve, reject) => {
			const urlPrefix = "http://cs310.students.cs.ubc.ca:11316/api/v1/";
			const url = `${urlPrefix}project_team${213}/${encodeURIComponent(building["address"])}`;
			http.get(url, (res) => {
				const {statusCode} = res;
				const contentType = res.headers["content-type"];
				let error;
				if (statusCode !== 200) {
					error = new Error("Request Failed.\n" +
						`Status Code: ${statusCode}`);
				} else if (typeof contentType === "string" && !/^application\/json/.test(contentType)) {
					error = new Error("Invalid content-type.\n" +
						`Expected application/json but received ${contentType}`);
				}
				if (error) {
					reject(error);
					res.resume();
					return;
				}
				res.setEncoding("utf8");
				let rawData = "";
				res.on("data", (chunk) => {
					rawData += chunk;
				});
				res.on("end", () => {
					try {
						const parsedData = JSON.parse(rawData);
						building["lon"] = parsedData.lon;
						building["lat"] = parsedData.lat;
						resolve(building);
					} catch (e) {
						reject(e);
					}
				});
			}).on("error", (e) => {
				reject(e);
			});
		});
	}
}
