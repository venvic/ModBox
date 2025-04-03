

interface BeteiligungProps {
    product: {
      id: string
      slug: string
    }
    module: {
      id: string
      name: string
      description: string
      type: string
      settings: string
      slug: string
    }
  }

const Beteiligungsmodul: React.FC<BeteiligungProps> = ({ product, module }) => {
  return (
    <div>
      <h1>{module.name}</h1>
      <p>{module.description}</p>
    </div>
  );
}


export default Beteiligungsmodul;