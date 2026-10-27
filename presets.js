/* 예제 데이터 — 기존 빌더의 프리셋을 유지하고 국민투표 표시를 실제 결과에 맞게 바로잡음 */
window.PRESETS = {
  ko_referendum_quebec_1995: {
    electionType: "referendum",
    electionName: "1995년 퀘벡 독립 국민투표",
    flagImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Flag_of_Quebec.svg/50px-Flag_of_Quebec.svg.png",
    beforeElectionYear: "1980",
    afterElectionYear: "",
    electionDate: "1995년 10월 30일",
    title: "독립 여부",
    previewWidth: 320,
    turnoutDetails: "퀘벡 주 헌법적 주권국 지위 부여 찬반 여부",
    registeredVoters: "5,087,009",
    turnoutText: "4,757,509\n'''93.52%''' ({{increase}} 14.1pp)",
    mapImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Quebec_referendum_1995_map.svg/350px-Quebec_referendum_1995_map.svg.png",
    mapCaption: "지역구별 찬반 투표 결과.\n청색 계열은 '찬성(Yes)' 과반수, 적색 계열은 '반대(No)' 과반수를 나타냅니다. 색이 짙을수록 더 높은 과반 비율을 의미합니다.",
    beforeElection: "1980년 국민투표",
    beforeParty: "부결 (59.56%)",
    afterElection: "향후 독립안",
    afterParty: "추진 미정",
    customStats: [
      { id: "qs1", label: "결과 결정 방식", value: "단판 다수결제" }
    ],
    referendumQuestion: "Do you agree that Quebec should become sovereign after having made a formal offer to Canada for a new economic and political partnership within the scope of the bill respecting the future of Quebec and of the agreement signed on June 12, 1995?",
    referendumChoices: [
      { id: "rc1", label: "찬성 (Yes)", votes: "2,308,360", percentage: "49.42%", color: "#2e8540" },
      { id: "rc2", label: "반대 (No)", votes: "2,362,648", percentage: "50.58%", color: "#c62828" },
      { id: "rc3", label: "유효 투표수 (Valid)", votes: "4,671,008", percentage: "98.18%" },
      { id: "rc4", label: "무효 및 기권표 (Invalid/Blank)", votes: "86,501", percentage: "1.82%" },
      { id: "rc5", label: "총 투표수 (Total)", votes: "4,757,509", percentage: "100.00%" }
    ],
    candidates: []
  },
  ko_referendum_vietnam_1955: {
    electionType: "referendum",
    electionName: "1955년 베트남 국체 국민투표",
    flagImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Flag_of_South_Vietnam.svg/50px-Flag_of_South_Vietnam.svg.png",
    beforeElectionYear: "",
    afterElectionYear: "",
    electionDate: "1955년 10월 23일",
    title: "정치 체제",
    previewWidth: 320,
    turnoutDetails: "베트남국의 군주제 유지 또는 공화제 전환 결정 투표",
    registeredVoters: "5,335,668",
    turnoutText: "5,784,752\n'''108.42%''' (초과 투표 발생)",
    mapImage: "",
    mapCaption: "사이공 특별지구 및 지방행정구역 전체에서 공화정 수립안이 압도적인 표차로 가결되었습니다.",
    beforeElection: "베트남국 (군주제)",
    beforeParty: "바오다이 황제 소속",
    afterElection: "베트남 공화국 (공화제)",
    afterParty: "고딘디엠 대통령 소속",
    customStats: [
      { id: "v_qs1", label: "투표 비정상 지수", value: "'''초과 투표 108% 발생'''" }
    ],
    referendumQuestion: "베트남은 공화국이 되어야 합니까, 아니면 군주제로 남아야 합니까?\n(Should the State of Vietnam become a Republic or remain a Monarchy?)",
    referendumChoices: [
      { id: "v_rc1", label: "공화정 수립 (바오다이 폐위 및 고딘디엠 옹립)", votes: "5,721,735", percentage: "98.91%", color: "#c8102e" },
      { id: "v_rc2", label: "군주제 유지 (바오다이 황제 지지)", votes: "63,017", percentage: "1.09%", color: "#d4a017" },
      { id: "v_rc3", label: "유효 투표수 (Valid)", votes: "5,784,752", percentage: "100.00%" },
      { id: "v_rc4", label: "무효 및 백지표 (Invalid/Blank)", votes: "0", percentage: "0.00%" },
      { id: "v_rc5", label: "총 투표수 (Total)", votes: "5,784,752", percentage: "100.00%" }
    ],
    candidates: []
  },
  ko_local_2026_fictional: {
    electionType: "local",
    electionName: "2026년 제9회 가상 대한민국 지방선거",
    flagImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Flag_of_South_Korea.svg/50px-Flag_of_South_Korea.svg.png",
    beforeElectionYear: "2022",
    afterElectionYear: "2030",
    electionDate: "2026년 6월 3일",
    title: "지방 정부",
    previewWidth: 320,
    turnoutDetails: "'''16개 광역행정수장'''\n'''933명 광역의원'''\n'''227개 기초지자체장'''\n'''3,034명 기초의원'''",
    registeredVoters: "34,079,860",
    turnoutText: "27,253,457\n'''61.0%''' ({{increase}} 10.1pp)''^[1]''",
    mapImage: "",
    mapCaption: "광역지자체 전역에서 진행된 가상 모의 선거 투표 지표",
    beforeElection: "이수현",
    beforeParty: "미래새힘당",
    afterElection: "정선우",
    afterParty: "가상민주당",
    customStats: [
      { id: "s1_f", label: "전국 자치 의석수", value: "'''4,210석'''" }
    ],
    candidateFieldsConfig: [
      { id: "image", label: "프로필 이미지", type: "image" },
      { id: "regionalSeatsLast", label: "직전 선거 광역의석", type: "text" },
      { id: "municipalSeatsLast", label: "직전 선거 기초의석", type: "text" },
      { id: "regionalSeatsWon", label: "획득 광역의석", type: "text" },
      { id: "municipalSeatsWon", label: "획득 기초의석", type: "text" },
      { id: "regionalSeatsChange", label: "광역의석 증감", type: "text" },
      { id: "municipalSeatsChange", label: "기초의석 증감", type: "text" }
    ],
    candidates: [
      {
        id: "1",
        name: "정선우",
        party: "가상민주당",
        color: "#004EA2",
        fieldValues: {
          image: "",
          regionalSeatsLast: "5개 단체장\n322명 의원",
          municipalSeatsLast: "63개 단체장\n1,384명 의원",
          regionalSeatsWon: "'''12개 단체장'''\n'''589명 의원'''",
          regionalSeatsChange: "{{increase}} 7개 단체장\n{{increase}} 267명 의원",
          municipalSeatsWon: "'''119개 단체장'''\n'''1,574명 의원'''",
          municipalSeatsChange: "{{increase}} 56개 단체장\n{{increase}} 190명 의원"
        }
      },
      {
        id: "2",
        name: "장지혁",
        party: "미래새힘당",
        color: "#E61E2B",
        fieldValues: {
          image: "",
          regionalSeatsLast: "12개 단체장\n540명 의원",
          municipalSeatsLast: "145개 단체장\n1,435명 의원",
          regionalSeatsWon: "'''4개 단체장'''\n'''327명 의원'''",
          regionalSeatsChange: "{{decrease}} 8개 단체장\n{{decrease}} 213명 의원",
          municipalSeatsWon: "'''95개 단체장'''\n'''1,277명 의원'''",
          municipalSeatsChange: "{{decrease}} 50개 단체장\n{{decrease}} 158명 의원"
        }
      }
    ]
  },
  ko_leg_2024_fictional: {
    electionType: "legislative",
    electionName: "2024년 가상 공화국 국회의원 선거",
    flagImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Flag_of_South_Korea.svg/50px-Flag_of_South_Korea.svg.png",
    beforeElectionYear: "2020",
    afterElectionYear: "2028",
    electionDate: "2024년 4월 10일",
    title: "의회",
    previewWidth: 320,
    turnoutDetails: "'''국회의원 300석 전체'''\n원내 과반수 기준: '''151석'''",
    registeredVoters: "44,280,011",
    turnoutText: "지역구: '''66.97%''' ({{increase}} 0.77pp)\n비례대표: '''66.99%''' ({{increase}} 0.78pp)",
    mapImage: "",
    mapCaption: "가상 의회 선거구별 원내 다당 구조 배치 양상",
    beforeElection: "이선우",
    beforeParty: "새한빛연대",
    afterElection: "송민기",
    afterParty: "새한빛연대",
    customStats: [
      { id: "s2_f", label: "비례 의석 비율", value: "15.3% (46석)" }
    ],
    candidateFieldsConfig: [
      { id: "image", label: "프로필 이미지", type: "image" },
      { id: "alliance", label: "소속 연합(Alliance)", type: "text" },
      { id: "lastElection", label: "이전 선거 의석", type: "text" },
      { id: "seatsWon", label: "획득 의석수(Seats won)", type: "text" },
      { id: "seatChange", label: "의석수 증감(Seat change)", type: "text" },
      { id: "constituencyVote", label: "지역구 표수", type: "text" },
      { id: "constituencyPercent", label: "지역구 득표율 & Swing", type: "text" },
      { id: "regionalVote", label: "비례대표 표수", type: "text" },
      { id: "regionalPercent", label: "비례대표 득표율 & Swing", type: "text" }
    ],
    candidates: [
      {
        id: "1",
        name: "이재현",
        party: "새한빛연대",
        color: "#004EA2",
        fieldValues: {
          image: "",
          alliance: "가상민주연합''^[a]''",
          lastElection: "180석''^[b]''",
          seatsWon: "'''173'''''^[c]''",
          seatChange: "{{decrease}} 7",
          constituencyVote: "15,075,279",
          constituencyPercent: "'''51.57%''' ({{increase}} 1.66 pp)",
          regionalVote: "7,567,459",
          regionalPercent: "'''26.70%''' ({{decrease}} 6.66pp)"
        }
      },
      {
        id: "2",
        name: "한민우",
        party: "자유혁신당",
        color: "#E61E2B",
        fieldValues: {
          image: "",
          alliance: "--",
          lastElection: "103석''^[e]''",
          seatsWon: "'''108'''",
          seatChange: "{{increase}} 5",
          constituencyVote: "13,179,769",
          constituencyPercent: "'''45.08%''' ({{increase}} 3.62 pp)",
          regionalVote: "10,395,264",
          regionalPercent: "'''36.67%''' ({{increase}} 2.83pp)"
        }
      }
    ]
  },
  ko_pres_2025_fictional: {
    electionType: "presidential",
    electionName: "2025년 가상 연합공화국 대통령 선거",
    flagImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Flag_of_South_Korea.svg/50px-Flag_of_South_Korea.svg.png",
    beforeElectionYear: "2022",
    afterElectionYear: "2030",
    electionDate: "2025년 6월 3일",
    title: "대통령",
    previewWidth: 320,
    turnoutDetails: "공표 모의 총조사 통계치 기준",
    registeredVoters: "44,391,871",
    turnoutText: "'''79.38%''' ({{increase}} 2.30 pp)",
    mapImage: "",
    mapCaption: "가상 연합공화국 연방 단위 정당 지표 지형도",
    beforeElection: "임재훈",
    beforeParty: "자유국민당",
    afterElection: "박서연",
    afterParty: "가상민주당",
    customStats: [
      { id: "s3_1_f", label: "공동 조사원", value: "메트릭스 통합연대" },
      { id: "s3_2_f", label: "신뢰 수준", value: "95% 오차범위 ±3.1%" }
    ],
    candidateFieldsConfig: [
      { id: "image", label: "프로필 이미지", type: "image" },
      { id: "votes", label: "득표수", type: "text" },
      { id: "percentage", label: "득표율", type: "text" },
      { id: "custom_slogan", label: "대표 슬로건", type: "text" }
    ],
    candidates: [
      {
        id: "1",
        name: "박서연",
        party: "가상민주당",
        color: "#004EA2",
        fieldValues: {
          image: "",
          votes: "17,287,513",
          percentage: "'''49.42%'''",
          custom_slogan: "'''더 나은 가상, 더 튼튼한 미래'''"
        }
      },
      {
        id: "2",
        name: "김태준",
        party: "자유국민당",
        color: "#E61E2B",
        fieldValues: {
          image: "",
          votes: "14,395,639",
          percentage: "'''41.15%'''",
          custom_slogan: "'''상식과 법치, 상생하는 발전'''"
        }
      },
      {
        id: "3",
        name: "서지훈",
        party: "개혁전진당",
        color: "#FF7016",
        fieldValues: {
          image: "",
          votes: "2,917,523",
          percentage: "'''8.34%'''",
          custom_slogan: "'''청년의 힘으로 시대를 혁신합니다'''"
        }
      }
    ]
  }
};
