const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended : true}));
app.use('/public', express.static('public'));

const mongoose = require('mongoose');
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

require('dotenv').config();


mongoose.connect(process.env.DB_URL,
    {useNewUrlParser: true, useUnifiedTopology: true, autoIndex: false })
    .then(() =>
        app.listen(process.env.PORT, function (){
            console.log("listening on 8080");
        })
    ).catch((error) => {
        console.error("MongoDB connection error:", error);
    });


// 데이터를 저장할 컬렉션의 스키마 정의
const counterSchema = new mongoose.Schema({
    totalPost: { type: Number, required: true },
    name: { type: String, required: true },

});

// 데이터를 저장할 컬렉션의 스키마 정의
const postSchema = new mongoose.Schema({
    _id : {type : Number, required: true },
    title: {type: String, required: true },
    date: { type: String, required: true},
});

// 데이터를 저장할 컬렉션의 스키마 정의
const loginSchema = new mongoose.Schema({
    id: {type: String, required: true },
    pw: { type: String, required: true },

});

const Counter = mongoose.model('counter', counterSchema);
const Post = mongoose.model('post', postSchema);
const Login = mongoose.model('login', loginSchema);


// 텍스트 검색 쿼리 예시
const searchQuery = 'sample';


app.get('/', function (req, res){
    res.render('index.ejs', {user: req.user});
});

app.get('/write', function (req, res){
    res.render('write.ejs', {user: req.user});
});

app.post('/add', async function (req,res){
    const counters = await Counter.findOne({name : '게시물갯수'}).exec();
    // post collection에 id에 1씩 추가
    new Post({_id : counters.totalPost + 1, title: req.body.title, date: req.body.date})
        .save().then(() => {
            // counter collection에 게시물갯수 업데이트
            Counter.updateOne({name : "게시물갯수"}, {$inc : {totalPost : 1}}).exec();
            res.redirect('/list');
    });


});

app.get('/list', async function (req, res){
    const posts = await Post.find({}).exec();
    res.render('list.ejs', {posts: posts, user: req.user});
})

app.delete('/delete', function (req, res){
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    Post.deleteOne(req.body).exec().then(() => {
        res.status(200).send({message : '성공했습니다.'});
    });
})

app.get('/detail/:id', async function (req, res){
    try {
        const posts = await Post.findOne({ _id: req.params.id }).exec();

        if (!posts) {
            return res.status(404).send("해당 포스트를 찾을 수 없습니다.");
        }

        res.render('detail.ejs', { posts: posts, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send("내부 서버 오류");
    }
});

app.get('/edit/:id', async function (req, res){
    try {
        const posts = await Post.findOne({ _id: req.params.id }).exec();

        if (!posts) {
            return res.status(404).send("해당 포스트를 찾을 수 없습니다.");
        }

        res.render('edit.ejs', { posts: posts , user : req.user});
    } catch (err) {
        console.error(err);
        res.status(500).send("내부 서버 오류");
    }
});

app.put('/edit', function (req, res){
    // Counter.updateOne({name : "게시물갯수"}, {$inc : {totalPost : 1}}).exec();
    Post.updateOne({_id : req.body.id },
        {$set : {title : req.body.title, date : req.body.date }})
        .exec().then(async () => {
            res.redirect('/list');
    });
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res){
    res.render('login.ejs', {user : req.user});
})

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/login'
}), function (req, res){
    res.redirect('/mypage');
});

app.get('/mypage', isLogin, function (req, res){
    res.render('mypage.ejs', {user : req.user});
})

function isLogin(req, res, next){
    if(req.user){
        next();
    }else{
        res.send('로그인 안하셨는데요?');
    }
}

app.get('/register', function (req, res){
    res.render('register.ejs');
});

app.post('/register', function (req, res){
    new Login({id : req.body.id, pw : req.body.pw}).save().then(() => {
        res.redirect('/welcome');
    })
})

app.get('/welcome', function (req, res){
    res.render('welcome.ejs');
})

app.get('/search', (req, res) => {
    Post.find({$text : {$search : req.query.value}}).exec().then((result) => {
        res.render('search.ejs', {result : result, user : req.user});
    })
})

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function (inputId, inputPw, done) {
    Login.findOne({ id: inputId }).exec().then((result) => {
        // DB에 아이디가 없으면
        if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
        // 결과가 맞으면
        if (inputPw == result.pw) {
            // done(서버 에러, 사용자 DB 데이터
            return done(null, result)
        // 결과가 맞지 않으면
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

// id를 이용해서 세션을 저장시키는 코드(로그인 성공시 발동)
passport.serializeUser(function (user, done){
    done(null, user.id)
});

// 이 세션 데이터를 가진 사람을 DB에서 찾아주세요(마이페이지 접속시 발동)
passport.deserializeUser(function (id, done){
    // db에서 위에 있는 user.id로 유저를 찾은 뒤에 유저 정보를 {}에 넣는다.
    Login.findOne({id : id}).exec().then((result) => {
        done(null, result);
    })
});


