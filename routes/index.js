const express = require("express");
const photoSchema = require("../schemas/photo");
const tagSchema = require("../schemas/tags");
const mongoose = require("mongoose");
const router = express.Router();

//앨범 목록 보내주기
router.get("/:id", async (req, res) => {
    try {
        const androidId = req.params.id;

        const customAlbums = await mongoose.model(androidId, photoSchema, androidId).aggregate([
            {
                $match: {
                    "album.type": "customAlbum"
                }
            }, {
                $group: { 
                    _id: {
                        type: "$album.type",
                        title: "$album.title",
                        thumbnail: "$album.thumbnail"
                    }
                } 
            }, {
                $sort: {
                    "_id.title": -1
                }
            }
        ]);
        console.log(customAlbums);

        const dateAlbums = await mongoose.model(androidId, photoSchema, androidId).aggregate([
            {
                $match: {
                    "album.type": "dateAlbum"
                }
            }, {
                $group: { 
                    _id: {
                        type: "$album.type",
                        title: "$album.title",
                        thumbnail: "$album.thumbnail"
                    }
                } 
            }, {
                $sort: {
                    "_id.title": -1
                }
            }
        ]);
        console.log(dateAlbums);

        let years = [];
        let yearAlbums = []; 
        let months = [];
        let monthAlbums = [];

        dateAlbums.forEach((e, i) => {
            let date = e._id.title.split("-");
            if(!years.includes(date[0])) {
                years.push(date[0]);
                yearAlbums.push({
                    title: date[0],
                    thumbnail: e._id.thumbnail
                });
            }
            if(!months.includes(date[0]+"-"+date[1])){
                months.push(date[0]+"-"+date[1]);
                monthAlbums.push({
                    title: date[0]+"-"+date[1],
                    thumbnail: e._id.thumbnail
                });
            }
            console.log(yearAlbums, monthAlbums);

        });

        var resJson = {
            "customAlbums" : customAlbums,
            "dateAlbums" : dateAlbums,
            "yearAlbums" : yearAlbums,
            "monthAlbums" : monthAlbums
        };

        res.json(resJson);

    } catch (err) {
        console.error(err);
        res.json("ERROR");
    }
})

//해당 앨범의 사진들 보내주기
router.get("/:id/:title", async (req, res) => {
    try{
        const androidId = req.params.id;
        console.log(req.params.title);

        const result = await mongoose.model(androidId, photoSchema, androidId).find({
            "album.title": { $regex : req.params.title },
        }).sort({
            "album.title" : 1,
            "page.layoutOrder" : 1
        });
        console.log(result);
        res.json(result);

    } catch(err) {
        console.error(err);
    }
});

//받은 사진들 저장하기
router.post("/:id/:title", async (req, res) => {
    try{
        const androidId = req.params.id;
        const albumId = "album" + androidId;

        console.log(req.body);
        
        //사진들
        const album = req.body.album;
        const photos = req.body.photos;
        const deletedList = req.body.deletedList;

        var resJson = new Array();
        
        //앨범
        if(!album.thumbnail){
            album.thumbnail = photos[0].uri;
        }

        //사진 삭제
        for(idx in deletedList){
            await mongoose.model(androidId, photoSchema, androidId).deleteOne({
                _id: deletedList._id,
            })
        }
        
        //사진 생성 및 수정
        for(idx in photos){
            console.log(idx, ": ", photos[idx]);
            const photo = photos[idx];
            var result;

            if(photo._id) {
                result = await mongoose.model(androidId, photoSchema, androidId).findOneAndUpdate({
                    _id: photo._id 
                }, {
                    $set: {
                        comment: photo.comment,
                        album: album,
                        page: photo.page,
                    }
                }, {
                    new: true
                });
            }
            else {
                var datetime; 
                try {
                    datetime = new Date(photo.datetime);
                    if (datetime == "Invalid Date") datetime = new Date();
                } catch (err) {
                    console.log(err);
                    datetime = new Date();
                };

                result = await mongoose.model(androidId, photoSchema, androidId).create({
                    uri: photo.uri,
                    datetime: datetime,
                    location: photo.location,
                    comment: photo.comment,
                    album: album,
                    page: photo.page,
                });
            }
            console.log("result : ", result);
            resJson.push(result);
        };

        res.json({"resJson": resJson});
    
    } catch(err) {
        console.log(err);
        res.json({"resJson": "ERROR"});
    }
});

router.get("/:id/search", async (req, res) => {
    const androidId = req.params.id;
    const query = req.query.query;
    console.log(query);

    const tagResult = await mongoose.model(androidId, photoSchema, androidId).find({
        "tags": { $elemMatch: query },
    });
    
    const commentResult = await mongoose.model(androidId, photoSchema, androidId).find({
        "comment": { $regex: query },
    });

    const addressResult = await mongoose.model(androidId, photoSchema, androidId).find({
        "location.address": { $regex: query },
    });

    const albumResult = await mongoose.model(androidId, photoSchema, androidId).find({
        "album.title": { $regex: query },
    });

    //얼굴, 날짜

})

module.exports = router;
