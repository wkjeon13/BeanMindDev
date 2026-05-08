export const WEEKLY_MBTI_DATA = {
    title: "이번 주말, 당신의 기분은?",
    questions: [
        {
            id: 'q1',
            text: "토요일 아침, 눈을 떴을 때 가장 먼저 하고 싶은 일은?",
            options: [
                { id: 'a', text: "조용히 책을 읽으며 여유 즐기기", trait: 'E', points: 1 }, // Ethiopia (Light/Floral)
                { id: 'b', text: "신나는 음악을 틀고 청소하기", trait: 'B', points: 1 }  // Brazil (Nutty/Balanced)
            ]
        },
        {
            id: 'q2',
            text: "갑자기 비가 내리기 시작합니다. 당신의 반응은?",
            options: [
                { id: 'a', text: "창밖을 보며 감성에 젖는다", trait: 'C', points: 1 }, // Colombia (Sweet/Soft)
                { id: 'b', text: "비 오는 날엔 역시 부침개지!", trait: 'I', points: 1 }  // Indonesia (Earthy/Heavy)
            ]
        },
        {
            id: 'q3',
            text: "친구가 갑자기 만나자고 연락이 왔습니다.",
            options: [
                { id: 'a', text: "분위기 좋은 힙한 카페로 간다", trait: 'G', points: 1 }, // Guatemala (Complex)
                { id: 'b', text: "편안한 동네 단골 카페로 간다", trait: 'P', points: 1 }  // Peru (Mild/Decaf)
            ]
        }
    ],
    results: {
        'E': {
            name: "에티오피아 예가체프",
            title: "화사한 봄날 같은 감성가득 커피",
            desc: "꽃향기와 상큼한 과일 산미가 당신의 이번 주말을 더욱 특별하게 만들어줄 거예요.",
            imageUrl: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=800&q=80"
        },
        'B': {
            name: "브라질 세하도",
            title: "편안하고 균형잡힌 클래식 커피",
            desc: "고소한 견과류 향과 부드러운 단맛이 바쁜 일상 속 확실한 휴식이 되어줄 거예요.",
            imageUrl: "https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?w=800&q=80"
        },
        'default': {
            name: "콜롬비아 수프리모",
            title: "호불호 없는 부드러운 스위트 커피",
            desc: "마일드한 바디감과 카라멜 같은 단맛이 어떤 기분에도 완벽하게 어울립니다.",
            imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80"
        }
    }
};
