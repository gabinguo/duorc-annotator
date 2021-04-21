import React, {useState, useEffect, useRef} from "react"
import './App.css';
import 'antd/dist/antd.css';
import { Row, Col, Space, Progress, Button, Spin, message, notification, Modal } from "antd"
import axios from "axios"
import storageUtil from "./util/storageUtil";
import memoryUtil from "./util/memoryUtil"
import uuidv4 from "./util/uuid"

function App() {
  const [answerSelected, setAnswerSelected] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [example, setExample] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [progressStatus, setProgressStatus] = useState(888)
  const [answerStartPos, setAnswerStartPos] = useState(-1)
  const [countAnnotated, setCountAnnotated] = useState(0)
  const [passed, setPassed] = useState(0)
  const [failed, setFailed] = useState(0)
  const progressBarRef = useRef(null)
  


  const req_single_example = (idx) => {
    return axios.get(`/data/${idx}`)
  } 

  const req_overall_count = () => {
    return axios.get("/overview")
  }

  const update_overall_count = (count) => {
    return axios.post("/overview", JSON.stringify({"count": count}), {
      "headers": {
        "Content-Type": "application/json"
      }
    })
  }

  const send_single_example = (payload) => {
    return axios.post("/annotations", JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  const req_examples_by_tmp_key = (tmp_key) => {
    return axios.get(`/annotations?user_id=${memoryUtil.tmp_key}`)
  }

  const req_examples = () => {
    return axios.get('/annotations')
  }

  useEffect(() => {
    if (!storageUtil.getTmpKey()){
      const uuid = uuidv4()
      memoryUtil.tmp_key = uuid
      storageUtil.saveTmpKey(memoryUtil)
    }
    memoryUtil.tmp_key = storageUtil.getTmpKey()
    setIsFetching(true)
    req_examples().then(res => {
      if (res){
        const dataIds = res["data"].map(r => r["data_id"])
        const user_ids = res["data"].map(r => r["user_id"])
        const occurence_map = user_ids.reduce((acc, curr) => {
          if (typeof acc[curr] === "undefined"){
            acc[curr] = 1
          }else{
            acc[curr] += 1
          }
          return acc
        }, {})
        const leaderboard = []
        Object.keys(occurence_map).sort(function(a,b){return occurence_map[b]-occurence_map[a]}).forEach(key => {
          leaderboard.push({
            key,
            score: occurence_map[key]
          })
        })
        setLeaderboard(leaderboard)
        return dataIds
      } 
    }).then((dataIds) => {
      if (dataIds){
        while(true){
          var randInt = Math.floor(Math.random() * 60000);
          if (dataIds.indexOf(randInt) === -1) break;
        }
        req_single_example(randInt).then(res => {
          if (res){
            setExample(res["data"])
            setIsFetching(false)
          }
        })
      }
    })

    req_overall_count().then(res => {
      if(res){
        setProgressStatus(res["data"]["count"])
      }
    })

    req_examples_by_tmp_key(memoryUtil.tmp_key).then(res => {
      if(res){
        let pass = 0
        let fail = 0
        res["data"].forEach(example => {
          const context = example["paragraphs"][0]["context"]
          const {text, answer_start} = example["paragraphs"][0]["qas"][0]["answers"][0]
          if (context.substring(answer_start, answer_start + text.length) === text){
            pass += 1
          } else {
            fail += 1
          }
        })
        setPassed(pass)
        setFailed(fail)
        setCountAnnotated(res["data"].length)
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
    if (progressBarRef.current) {
      progressBarRef.current.scrollIntoView({ "behavior": "smooth" })
    }
    setIsFetching(true)
    req_single_example(Math.floor(Math.random() * 60000)).then(res => {
      if(res){
        setExample(res["data"])
        setIsFetching(false)
        setAnswerSelected("")
      }
    })
  }

  const handleSubmit = () => {
    setIsFetching(true)
    const { question, plot, title, question_id, no_answer, id} = example
    if (!answerSelected){
      message.error("No answer selected.")
      return
    }
    const payload = {
      title,
      "user_id": memoryUtil.tmp_key,
      "data_id": id,
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
    send_single_example(payload).then(res => {
      if (res){
        update_overall_count(progressStatus + 1)
        setProgressStatus(progressStatus + 1)
        notification.success({
          message: "Congratulations 🎉",
          description: "Succesfully added one annotation : )",
          placement: "bottomRight"
        })
        axios.get(`/annotations?user_id=${memoryUtil.tmp_key}`).then(res => {
          if(res){
            let pass = 0
            let fail = 0
            res["data"].forEach(example => {
              const context = example["paragraphs"][0]["context"]
              const {text, answer_start} = example["paragraphs"][0]["qas"][0]["answers"][0]
              if (context.substring(answer_start, answer_start + text.length) === text){
                pass += 1
              } else {
                fail += 1
              }
            })
            setPassed(pass)
            setFailed(fail)
            setCountAnnotated(res["data"].length)
          }
        })
        req_single_example(Math.floor(Math.random() * 60000)).then(res => {
          if(res){
            setExample(res["data"])
            setIsFetching(false)
            setAnswerSelected("")
            if (progressBarRef.current) {
              progressBarRef.current.scrollIntoView({ "behavior": "smooth" })
            }
          }
        })
      }
    })
  }

  const leaderboardComponent = (
    <Row>
        <div className="annotation-status" style={{textAlign: "center"}}>
          <h1>Leaderboard</h1>
            <table style={{width: "100%"}}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>key</th>
                  <th>total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((info, index) => {
                  return (
                    <tr>
                      <td>{index+1}</td>
                      <td>{info["key"]}</td>
                      <td style={{color: "green"}}>{info["score"]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
    </Row>
  )

  return (
    <div className="App">
      <Spin spinning={isFetching}>
        <Space direction="vertical" size="large" style={{width: "100%"}}>
          <Row>
            <div className="progress-bar" ref={progressBarRef}>
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
            <div className="main-title" >
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
                <div style={{height: "80%", position: "sticky", top: 20}}>
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
                      <td>{countAnnotated}</td>
                      <td style={{color: "green"}}>{passed}</td>
                      <td style={{color: "red"}}>{failed}</td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </Row>
          <div style={{textAlign: "end"}}>
            <h3>Key: {memoryUtil.tmp_key}</h3>
          </div>
        </Space>
      </Spin>
      <footer>
          <p onClick={() => setShowLeaderboard(!showLeaderboard)}>
            Thanks for your contribution.
          </p>
      </footer>
      <Modal 
        visible={showLeaderboard} 
        onCancel={() => setShowLeaderboard(false)} 
        onOk={() => setShowLeaderboard(false)}
        okButtonProps={{style: {display: "none"}}}
        cancelButtonProps={{style: {display: "none"}}}
        closable={false}
        width={800}
      >
        {leaderboardComponent}
      </Modal>
    </div>
  );
}

export default App;
