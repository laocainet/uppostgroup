const request = require('request');
const cheerio = require('cheerio');
const upload = require('./fbpost/post');
let waitTime = time=>{
  return new Promise(resolve=>{
      setTimeout(function(){
          return resolve(time*60000)
      },time*60000)
  })
};
let FINDid = (text,startS,lastS)=>{
    let start = text.indexOf(startS) + startS.length;
    let last = text.indexOf(lastS,start);

    if(text.indexOf(startS) > -1 && last > -1){
        let sub = text.substring(
            start,last
        );
        return sub;
    }else{
        return null
    }
};

let fb_dtsg_ACTION = ({url,cookie,agent})=>{
    return new Promise(resolve=> {
        let option = {
            method: 'get',
            url: url,
            headers: {
                "User-Agent": agent,
                "Cookie":cookie,
            },

        };
        request(option, function (err, res, body) {
            if(body.includes('https://www.facebook.com/login')){
                resolve(false)
            }else {
                resolve(FINDid(body, 'name="fb_dtsg" value="', '"'))
            }
        });
    });
};

let GetListIdPost = ({id,reaction,cookie,agent,fb_dtsg})=>{
    return new Promise(resolve=> {
        let option = {
            method: 'get',
            url: 'https://m.facebook.com/groups/'+id,
            headers: {
                "User-Agent": agent,
                "Cookie":cookie,

            }
        };
        request(option, async function (err, res, body) {
            let resultFinal = [];
            function read(pos){
                let start = body.indexOf('{ft_ent_identifier:',pos);
                let end = body.indexOf('{ft_ent_identifier:',start+1);
                let postText = body.slice(start,end);
                let postId = FINDid(postText,'{ft_ent_identifier:',',');
                if(end > -1){
                    resultFinal.push(postId);
                    return read(end)
                }else{
                    return resultFinal;
                }
            }

            return resolve(read(0))

        });
    });
};
let IMAGE_getContentPost = ({id,cookie,agent})=>{
    return new Promise(resolve=>{
        let option = {
            method: 'get',
            url: 'https://m.facebook.com/'+FINDid(cookie, "c_user=", ";")+'/posts/pcb.'+id,
            headers: {
                "User-Agent": agent,
                "Cookie":cookie,

            }
        };
        request(option, async function (err, res, body) {
            let link_img = [];
            function cutImgLink(index){
                let start = body.indexOf('full_width_image:{uri:"',index);
                let end = body.indexOf('"',start+25);

                if(start > -1 && end > -1){
                    let link = body.slice(start+23,end);
                    link_img.push(link);
                    return cutImgLink(end);
                }else{
                    return link_img
                }
            }
            return resolve(cutImgLink(0))


        });
    })
};

let getContentPost = ({id,cookie,agent})=>{
    return new Promise(resolve=>{
        let option = {
            method: 'get',
            url: 'https://m.facebook.com/'+id,
            headers: {
                "User-Agent": agent,
                "Cookie":cookie,

            }
        };
        request(option, async function (err, res, body) {
            body = body.replace(/<!--/g,'');

            let $ = cheerio.load(body);
            let content = '';
            let textRaw = $(`div[data-ft*="*s"]`).find('p').text();
            let textBackground = $(`div[data-ft*="*s"]`).find('span').eq(0).text();
            if(textRaw){
                content = textRaw
            }else if(textBackground){
                content = textBackground

            }
            content+=' #sapa';
            let color = null;
            let textID = $("div[data-ft*='text_formatting']").attr('data-ft');
            if(textID) {
                color = FINDid(textID,'"text_formatting":"','"');
            }
            let ImageArr = await IMAGE_getContentPost({cookie,agent,id});
            return resolve({content,color,ImageArr})
        });
    })
};



(async ()=>{
    let url = 'https://m.facebook.com/';
    let agent  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36';


    Array.prototype.diff = function(a) {
        return this.filter(function(i) {return a.indexOf(i) < 0;});
    };
    Array.prototype.sample = function(){
        return this[Math.floor(Math.random()*this.length)];
    };
    let oldArr = [];
    let i = 0;

    async function runSearch(){
        let config = require('./config');
        let cookie = config.cookie.sample();

        let fb_dtsg = await fb_dtsg_ACTION({url,cookie,agent});
        if(fb_dtsg === false){
            config.status = 'Cookie hết hạn';
            return await runSearch();

        }
        if(!config.group_GET){
            config.status = 'ID của group lấy bài post không hợp lệ !';
            return await runSearch();
        }
        if(!config.group_UPPOST){
            config.status = 'ID của group dùng để up bài vào không hợp lệ !';
            return await runSearch();
        }
        let newArr = await GetListIdPost({id:config.group_GET,cookie,agent,fb_dtsg});

        let newestArr = newArr.diff(oldArr);
        if(i>5){
            if(newestArr.length>0){
                let {content,color,ImageArr}  = await getContentPost({id:newestArr[0],cookie,agent});
                await waitTime(config.time); // khoảng thời gian chờ đợi để up post , đơn vị tính bằng "phút"
                await upload(
                    {
                        cookie,agent,
                        location:{
                            timeline:null,
                            group:{
                                id:config.group_UPPOST
                            },
                            page:null
                        },
                        content,ImageArr,color,
                        postLink:null,
                        youtubeLink:null
                    }
                )
            }
        }
        if(i < 6){
            i++
        }
        oldArr = oldArr.concat(newArr);
        return await runSearch();
    }
    await runSearch();








})();