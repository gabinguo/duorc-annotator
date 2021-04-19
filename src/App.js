import React, {useState, useEffect} from "react"
import './App.css';
import 'antd/dist/antd.css';
import { Row, Col, Space, Progress, Button, Spin, message} from "antd"
import axios from "axios"
import storageUtil from "./util/storageUtil";
import memoryUtil from "./util/memoryUtil"
import uuidv4 from "./util/uuid"


function App() {
  const [progressStatus, setProgressStatus] = useState(888)
  const [answerStartPos, setAnswerStartPos] = useState(-1)
  const [answerSelected, setAnswerSelected] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [example, setExample] = useState({})


  const req_single_example = (idx) => {
    return axios.get(`/data/${idx}`)
  } 

  useEffect(() => {
    if (!storageUtil.getTmpKey()){
      const uuid = uuidv4()
      memoryUtil.tmp_key = uuid
      storageUtil.saveTmpKey(memoryUtil)
    }
    memoryUtil.tmp_key = storageUtil.getTmpKey()
    setIsFetching(true)
    setProgressStatus(888)
    let randInt = Math.floor(Math.random() * 60000);
    req_single_example(randInt).then(res => {
      if (res){
        setExample(res["data"])
        setIsFetching(false)
      }
    })
  }, [])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    let startPos = selection.getRangeAt(0).startOffset
    const selected_text = selection.toString() || ""
    if (selected_text){
      if (selected_text.split(" ").length <= 15){
        setAnswerSelected(selected_text.trim())
        setAnswerStartPos(startPos)
      }else{
        message.warning("Try to limit the length of answers under 15 words.")
      }
    }
  }

  const handleSkip = () => {
    setIsFetching(true)
    req_single_example(Math.floor(Math.random() * 60000)).then(res => {
      if(res){
        setExample(res["data"])
        setIsFetching(false)
      }
    })
  }

  const handleSubmit = () => {
    const { question, plot, title, question_id, no_answer} = example
    if (!answerSelected){
      message.error("No answer selected.")
      return
    }
    const payload = {
      title,
      "paragraphs": [
        {
          "context": plot,
          "qas": [{
            "answers": [{
              "text": answerSelected,
              "answer_start": plot.charAt(answerStartPos) === " " ? answerStartPos + 1 : answerStartPos
            }],
            question,
            "id": question_id,
            "is_impossible": no_answer
          }]
        }
      ]
    }
    console.log(payload)
  }

  return (
    <div className="App">
      <Spin spinning={isFetching}>
        <Space direction="vertical" size="large" style={{width: "100%"}}>
          <Row>
            <div className="progress-bar">
              <Progress 
                status="active" 
                percent={progressStatus/1600 * 100} 
                format={percent => `${Math.floor(percent/100 * 1600)}/1600`}
                strokeColor={{
                  '0%': '#1890FF',
                  '100%': '#81b214',
                }}
              />
            </div>
          </Row>
          <Row>
            <div className="main-title">
              <h1>DuoRC Annotator</h1>
            </div>
          </Row>

          <Row gutter={[16, 16]}>
            <Col flex="7">
              <div className="content-display">
                <h1>{example["title"] && example["title"]}</h1>
                <h2>{example["question"] && `"${example["question"]}"`}</h2>
                <p onMouseUp={handleTextSelection}>
                  {example["plot"] && example["plot"]}
                </p>
              </div>
            </Col>
            <Col flex="3">
              <div className="answers">
                <Row style={{marginRight: 0}}>
                  <div className="answer-in-dataset">
                    <div className="answer-in-dataset-header">Answer in DuoRC</div>
                    <div>{example["answers"] && example["answers"][0]}</div>
                    <div className="answer-in-dataset-skip-button">
                      <Button style={{width: "100%"}} type="primary" onClick={() => handleSkip()}>Skip</Button>
                    </div>
                  </div>
                </Row>
                <Row style={{marginRight: 0}}>
                  <div className="answer-selected">
                    <div className="answer-selected-header">Answer you selected</div>
                    <div>{answerSelected || "\"Select your answer in the plot...\""}</div>
                    <div className="answer-selected-submit-button">
                      <Button style={{width: "100%"}} type="primary" onClick={() => handleSubmit()}>Submit</Button>
                    </div>
                  </div>
                </Row>
              </div>
            </Col>
          </Row>
          
          <Row>
            <div className="annotation-status">
                <table style={{width: "100%"}}>
                  <thead>
                    <tr>
                      <th>Total</th>
                      <th>Passed</th>
                      <th>Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>0</td>
                      <td style={{color: "green"}}>0</td>
                      <td style={{color: "red"}}>0</td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </Row>
        </Space>
      </Spin>
    </div>
  );
}

export default App;
