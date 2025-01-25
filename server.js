const grpc = require("@grpc/grpc-js")
const protoLoader = require("@grpc/proto-loader")
const mongoose = require("mongoose")

// Connect to MongoDB
mongoose.connect("mongodb+srv://tanishsingal245:HAPoko1WV9etGKXp@cluster0.f6yyg.mongodb.net/questions_db", { useNewUrlParser: true, useUnifiedTopology: true })
//HAPoko1WV9etGKXp
// Define Question schema
// const questionSchema = new mongoose.Schema({
//   type: String,
//   title: String,
  
// })
const BlockSchema = new mongoose.Schema({
  text: { type: String, required: true },
  showInOption: { type: Boolean, default: true },
  isAnswer: { type: Boolean, default: false },
});

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrectAnswer: { type: Boolean, default: false },
});

const QuizSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: {
    type: String,
    enum: ['MCQ', 'ANAGRAM', 'READ_ALONG', 'CONTENT_ONLY'],
    required: true,
  },
  anagramType: {
    type: String,
    enum: ['WORD', 'SENTENCE'],
    required: function () {
      return this.type === 'ANAGRAM';
    },
  },
  blocks: {
    type: [BlockSchema],
    required: function () {
      return this.type === 'ANAGRAM';
    },
  },
  options: {
    type: [OptionSchema],
    required: function () {
      return this.type === 'MCQ';
    },
  },
  siblingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
  },
  solution: {
    type: String,
    required: function () {
      return this.type === 'ANAGRAM';
    },
  },
  title: { type: String, required: true },
});


const Question = mongoose.model("Question", QuizSchema)

// Load proto file
const packageDefinition = protoLoader.loadSync("questions.proto", {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const questionsProto = grpc.loadPackageDefinition(packageDefinition).questions

// Implement the SearchQuestions RPC method
const searchQuestions = async (call, callback) => {
  const { query, page, pageSize } = call.request
  const skip = (page - 1) * pageSize

  try {
    const questions = await Question.find({ title: { $regex: query, $options: "i" } }, null, { skip, limit: 10000 })
    // , null, { skip, limit: pageSize }
    const total = await Question.countDocuments({ title: { $regex: query, $options: "i" } })

    callback(null, { questions, total })
  } catch (error) {
    callback(error)
  }
}

// Create gRPC server
const server = new grpc.Server()
server.addService(questionsProto.QuestionService.service, { SearchQuestions: searchQuestions })

// Start server
server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error(error)
    return
  }
  console.log(`Server running at http://0.0.0.0:${port}`)
  server.start()
})

