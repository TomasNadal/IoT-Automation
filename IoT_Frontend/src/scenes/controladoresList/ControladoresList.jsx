import React, { useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import Controlador from './Controlador';

const ControladoresList = () => {
  const { controladores } = useContext(DataContext);

  // Log the controladores array to check the structure
  console.log(controladores);

  return (
    <>
      {controladores.map((controlador) => (
        <Controlador key={controlador.id} controlador={controlador} />
      ))}
    </>
  );
};

export default ControladoresList;
